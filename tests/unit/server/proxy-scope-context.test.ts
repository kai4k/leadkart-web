/**
 * The proxy only runs a call in the context the page says it is showing. The browser sends the
 * page's context fingerprint (`x-lk-scope-context`, from SSR page data); the proxy compares it with
 * the signed cookie's BEFORE any call to Go. A mismatch, or no fingerprint, is a 409 `scope_changed`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST } from '../../../src/routes/api/[...path]/+server.ts';
import { scopeFingerprint, setOperatorScope, type OperatorScope } from '#lib/server/scope.ts';
import { SCOPE_CONTEXT_HEADER } from '#lib/api/scope-header.ts';

const PERSON = 'person-aaaa';
const TENANT_A: OperatorScope = {
	id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
	slug: 'tenant-a',
	display_name: 'Tenant A'
};
const TENANT_B: OperatorScope = {
	id: '9d9c7a52-0c7b-4e8d-8a3e-0e5d3e0b9f11',
	slug: 'tenant-b',
	display_name: 'Tenant B'
};

function accessToken(person: string): string {
	const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
	return `${seg({ alg: 'none' })}.${seg({ sub: person, tenant_id: 't1', membership_id: 'm1', exp: 4_000_000_000 })}.sig`;
}

function newJar(person = PERSON) {
	const store = new Map<string, string>([
		['lk_access', accessToken(person)],
		['lk_csrf', 'csrf-1']
	]);
	return {
		store,
		api: {
			get: (n: string) => store.get(n),
			set: (n: string, v: string) => void store.set(n, v),
			delete: (n: string) => void store.delete(n)
		}
	};
}

const fpOf = (scope: OperatorScope, person = PERSON) =>
	scopeFingerprint({ state: 'valid', scope }, newJar(person).api as never);
const fpNone = (person = PERSON) =>
	scopeFingerprint({ state: 'none' }, newJar(person).api as never);

let upstream: ReturnType<typeof vi.fn>;
beforeEach(() => {
	upstream = vi.fn(() => Promise.resolve(Response.json({ ok: true })));
	vi.stubGlobal('fetch', upstream);
});
afterEach(() => vi.unstubAllGlobals());

function call(
	handler: typeof GET,
	jar: ReturnType<typeof newJar>,
	opts: { method?: string; context?: string; headers?: Record<string, string> } = {}
) {
	const method = opts.method ?? 'GET';
	const headers = new Headers(opts.headers);
	if (opts.context !== undefined) headers.set(SCOPE_CONTEXT_HEADER, opts.context);
	if (method !== 'GET') headers.set('x-csrf-token', 'csrf-1');
	return handler({
		request: new Request('http://app/api/v1/users', {
			method,
			headers,
			body: method === 'GET' ? undefined : JSON.stringify({ a: 1 })
		}),
		params: { path: 'v1/users' },
		cookies: jar.api
	} as never);
}

const sentTenantHeader = () =>
	(upstream.mock.calls[0]![1] as RequestInit).headers instanceof Headers
		? ((upstream.mock.calls[0]![1] as RequestInit).headers as Headers).get('x-tenant-id')
		: null;

describe('proxy context fingerprint', () => {
	it('a page showing tenant A runs in tenant A', async () => {
		const jar = newJar();
		setOperatorScope(jar.api as never, TENANT_A);
		const res = await call(GET, jar, { context: fpOf(TENANT_A) });
		expect(res.status).toBe(200);
		expect(sentTenantHeader()).toBe(TENANT_A.id);
	});

	it.each(['GET', 'POST', 'DELETE'] as const)(
		'a %s from a tab showing tenant A never reaches Go once the cookie names tenant B',
		async (method) => {
			const jar = newJar();
			setOperatorScope(jar.api as never, TENANT_B); // tab 2 entered B
			const res = await call(method === 'GET' ? GET : method === 'POST' ? POST : DELETE, jar, {
				method,
				context: fpOf(TENANT_A) // tab 1 still shows A
			});
			expect(res.status).toBe(409);
			expect(await res.json()).toMatchObject({ error: 'scope_changed' });
			expect(upstream).not.toHaveBeenCalled();
		}
	);

	it('a tab showing the operator\'s own tenant ("none") is refused once a context was entered', async () => {
		const jar = newJar();
		setOperatorScope(jar.api as never, TENANT_B);
		const res = await call(POST, jar, { method: 'POST', context: fpNone() });
		expect(res.status).toBe(409);
		expect(await res.json()).toMatchObject({ error: 'scope_changed' });
		expect(upstream).not.toHaveBeenCalled();
	});

	it('a tab showing tenant A is refused after the context was exited elsewhere', async () => {
		const jar = newJar(); // no scope cookie any more
		const res = await call(GET, jar, { context: fpOf(TENANT_A) });
		expect(res.status).toBe(409);
		expect(await res.json()).toMatchObject({ error: 'scope_changed' });
		expect(upstream).not.toHaveBeenCalled();
	});

	it('own tenant on both sides ("none" and no cookie) goes through with no tenant header', async () => {
		const jar = newJar();
		const res = await call(POST, jar, { method: 'POST', context: fpNone() });
		expect(res.status).toBe(200);
		expect(sentTenantHeader()).toBeNull();
	});

	it.each(['GET', 'POST'] as const)(
		'a %s with no fingerprint is refused, in or out of a context',
		async (method) => {
			for (const entered of [false, true]) {
				upstream.mockClear();
				const jar = newJar();
				if (entered) setOperatorScope(jar.api as never, TENANT_A);
				const res = await call(method === 'GET' ? GET : POST, jar, { method });
				expect(res.status).toBe(409);
				expect(await res.json()).toMatchObject({ error: 'scope_changed' });
				expect(upstream).not.toHaveBeenCalled();
			}
		}
	);

	it('a fingerprint minted for another person is refused (the tab outlived a sign-in as someone else)', async () => {
		const jar = newJar('person-bbbb'); // tab 2 signed in as B; tab 1 still shows A's context
		const res = await call(POST, jar, { method: 'POST', context: fpNone('person-aaaa') });
		expect(res.status).toBe(409);
		expect(await res.json()).toMatchObject({ error: 'scope_changed' });
		expect(upstream).not.toHaveBeenCalled();
	});

	it('an invalid cookie keeps its own answer (scope_invalid) whatever the page says', async () => {
		const jar = newJar();
		jar.store.set('lk_op_tenant', 'garbage.sig');
		const res = await call(GET, jar, { context: 'invalid' });
		expect(res.status).toBe(409);
		expect(await res.json()).toMatchObject({ error: 'scope_invalid' });
		expect(upstream).not.toHaveBeenCalled();
	});

	it('a cookie replayed by another signed-in person is not a context: scope_invalid', async () => {
		const entered = newJar();
		setOperatorScope(entered.api as never, TENANT_A);
		const replayer = newJar('person-bbbb');
		replayer.store.set('lk_op_tenant', entered.store.get('lk_op_tenant')!);
		const res = await call(GET, replayer, { context: fpOf(TENANT_A) });
		expect(res.status).toBe(409);
		expect(await res.json()).toMatchObject({ error: 'scope_invalid' });
		expect(upstream).not.toHaveBeenCalled();
	});

	it('never forwards a tenant the browser supplied', async () => {
		const jar = newJar();
		setOperatorScope(jar.api as never, TENANT_A);
		await call(GET, jar, {
			context: fpOf(TENANT_A),
			headers: { 'x-tenant-id': TENANT_B.id }
		});
		expect(sentTenantHeader()).toBe(TENANT_A.id);
	});

	it('does not forward the fingerprint to Go', async () => {
		const jar = newJar();
		await call(GET, jar, { context: fpNone() });
		const sent = (upstream.mock.calls[0]![1] as RequestInit).headers as Headers;
		expect(sent.has(SCOPE_CONTEXT_HEADER)).toBe(false);
	});
});

describe('the session is decided before the scope', () => {
	it.each([
		['no scope cookie, no fingerprint', undefined],
		['a dead scope cookie', 'garbage.sig']
	])(
		'no access cookie and no refresh cookie: 401 session_expired (%s), Go not called',
		async (_n, scopeCookie) => {
			const jar = newJar();
			jar.store.delete('lk_access');
			if (scopeCookie) jar.store.set('lk_op_tenant', scopeCookie);
			const res = await call(GET, jar, { context: 'invalid' });
			expect(res.status).toBe(401);
			expect(await res.json()).toMatchObject({ error: 'session_expired' });
			expect(upstream).not.toHaveBeenCalled();
		}
	);

	it('no access cookie but a refresh cookie (the hook could not reach Go): 503 refresh_unavailable, never scope_invalid', async () => {
		const jar = newJar();
		jar.store.delete('lk_access');
		jar.store.set('lk_refresh', 'r1');
		jar.store.set('lk_op_tenant', 'garbage.sig');
		const res = await call(POST, jar, { method: 'POST' });
		expect(res.status).toBe(503);
		expect(await res.json()).toMatchObject({ error: 'refresh_unavailable' });
		expect(upstream).not.toHaveBeenCalled();
	});

	it('a signed-in caller with a dead scope cookie still gets scope_invalid', async () => {
		const jar = newJar();
		jar.store.set('lk_op_tenant', 'garbage.sig');
		const res = await call(GET, jar, { context: 'invalid' });
		expect(await res.json()).toMatchObject({ error: 'scope_invalid' });
	});
});

describe('session renewal signal', () => {
	const stale = () =>
		new Response('{"error":"stale_token"}', {
			status: 401,
			headers: {
				'www-authenticate': 'Bearer error="invalid_token"',
				'content-type': 'application/json'
			}
		});
	const tokens = () => Response.json({ access_token: accessToken(PERSON), refresh_token: 'r2' });

	it('a stale token that the BFF refreshes silently is reported to the page (so it re-reads its capabilities)', async () => {
		const jar = newJar();
		jar.store.set('lk_refresh', 'refresh-signal-1');
		upstream
			.mockReturnValueOnce(Promise.resolve(stale()))
			.mockReturnValueOnce(Promise.resolve(tokens())) // POST /v1/auth/refresh
			.mockReturnValueOnce(Promise.resolve(Response.json({ ok: true })));
		const res = await call(GET, jar, { context: fpNone() });
		expect(res.status).toBe(200);
		expect(res.headers.get('x-lk-session-renewed')).toBe('1');
	});

	it('a call that needed no renewal carries no signal', async () => {
		const res = await call(GET, newJar(), { context: fpNone() });
		expect(res.headers.has('x-lk-session-renewed')).toBe(false);
	});

	it('a refresh the hook already did for this request is reported too', async () => {
		const jar = newJar();
		const res = await (GET as (e: never) => Promise<Response>)({
			request: new Request('http://app/api/v1/users', {
				headers: { [SCOPE_CONTEXT_HEADER]: fpNone() }
			}),
			params: { path: 'v1/users' },
			cookies: jar.api,
			locals: { refreshOutcome: 'renewed' }
		} as never);
		expect(res.headers.get('x-lk-session-renewed')).toBe('1');
	});
});
