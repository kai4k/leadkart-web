/**
 * DELETE /api/operator/scope (leave the tenant context) carries the same proof every other call
 * does: the fingerprint of the context the tab shows. A tab that is behind cannot end a context
 * another tab just entered. The enter POST is exempt (it creates the context).
 */
import { describe, expect, it } from 'vitest';
import { DELETE } from '../../../src/routes/api/operator/scope/+server.ts';
import { scopeFingerprint, setOperatorScope, type OperatorScope } from '#lib/server/scope.ts';
import { SCOPE_CONTEXT_HEADER } from '#lib/api/scope-header.ts';

const PERSON = 'person-aaaa';
const TENANT_A: OperatorScope = {
	id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
	slug: 'tenant-a',
	display_name: 'Tenant A'
};
const TENANT_B: OperatorScope = { ...TENANT_A, id: '9d9c7a52-0c7b-4e8d-8a3e-0e5d3e0b9f11' };

const access = (person: string) => {
	const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
	return `${seg({ alg: 'none' })}.${seg({ sub: person, tenant_id: 't1', membership_id: 'm1', exp: 4_000_000_000 })}.sig`;
};

function newJar(extra: Record<string, string> = { lk_access: access(PERSON) }) {
	const store = new Map<string, string>([['lk_csrf', 'csrf-1'], ...Object.entries(extra)]);
	return {
		store,
		api: {
			get: (n: string) => store.get(n),
			set: (n: string, v: string) => void store.set(n, v),
			delete: (n: string) => void store.delete(n)
		}
	};
}
const fp = (reading: Parameters<typeof scopeFingerprint>[0], jar = newJar()) =>
	scopeFingerprint(reading, jar.api as never);

const exit = (jar: ReturnType<typeof newJar>, context?: string) =>
	DELETE({
		request: new Request('http://app/api/operator/scope', {
			method: 'DELETE',
			headers: { 'x-csrf-token': 'csrf-1', ...(context ? { [SCOPE_CONTEXT_HEADER]: context } : {}) }
		}),
		cookies: jar.api
	} as never);

describe('DELETE /api/operator/scope', () => {
	it('ends the context for the tab that shows it', async () => {
		const jar = newJar();
		setOperatorScope(jar.api as never, TENANT_A);
		const res = await exit(jar, fp({ state: 'valid', scope: TENANT_A }, jar));
		expect(res.status).toBe(200);
		expect(jar.store.has('lk_op_tenant')).toBe(false);
		// the answer is the fingerprint of "no context": what the layout will commit next
		expect(await res.json()).toEqual({ scope_context: fp({ state: 'none' }, jar) });
	});

	it('refuses a tab showing another context (409 scope_changed) and keeps the cookie', async () => {
		const jar = newJar();
		setOperatorScope(jar.api as never, TENANT_B); // another tab entered B
		const res = await exit(jar, fp({ state: 'valid', scope: TENANT_A }, jar)); // this tab shows A
		expect(res.status).toBe(409);
		expect(await res.json()).toMatchObject({ error: 'scope_changed' });
		expect(jar.store.has('lk_op_tenant')).toBe(true);
	});

	it('refuses a call with no fingerprint', async () => {
		const jar = newJar();
		setOperatorScope(jar.api as never, TENANT_A);
		expect((await exit(jar)).status).toBe(409);
		expect(jar.store.has('lk_op_tenant')).toBe(true);
	});

	it('a dead cookie can always be cleared: that is the recovery path', async () => {
		const jar = newJar();
		jar.store.set('lk_op_tenant', 'garbage.sig');
		const res = await exit(jar, 'invalid');
		expect(res.status).toBe(200);
		expect(jar.store.has('lk_op_tenant')).toBe(false);
	});

	it('the session is decided first: no access cookie is 401, a pending renewal is 503', async () => {
		const gone = newJar({});
		gone.store.set('lk_op_tenant', 'x.y');
		expect((await exit(gone, 'whatever')).status).toBe(401);
		const pending = newJar({ lk_refresh: 'r1' });
		expect((await exit(pending, 'whatever')).status).toBe(503);
		expect(gone.store.has('lk_op_tenant')).toBe(true);
	});
});

describe('an ended session on the scope endpoint', () => {
	it('is reported as one (401 session_expired), not as a CSRF problem, when no session cookie is left', async () => {
		const jar = newJar({}); // the rejected refresh deleted every cookie, lk_csrf included
		jar.store.delete('lk_csrf');
		const res = await DELETE({
			request: new Request('http://app/api/operator/scope', {
				method: 'DELETE',
				headers: { 'x-csrf-token': 'stale' }
			}),
			cookies: jar.api
		} as never);
		expect(res.status).toBe(401);
		expect(await res.json()).toMatchObject({ error: 'session_expired' });
	});

	it('with a session cookie a bad CSRF token is still a 403 first', async () => {
		const jar = newJar();
		const res = await DELETE({
			request: new Request('http://app/api/operator/scope', {
				method: 'DELETE',
				headers: { 'x-csrf-token': 'wrong' }
			}),
			cookies: jar.api
		} as never);
		expect(res.status).toBe(403);
	});
});
