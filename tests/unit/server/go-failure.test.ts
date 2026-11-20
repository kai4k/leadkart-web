import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/api/jwt.ts', () => ({
	decodeJwtPrincipal: () => ({ membershipId: 'm1', personId: 'p1' })
}));
vi.mock('#lib/api/jwt', () => ({
	decodeJwtPrincipal: () => ({ membershipId: 'm1', personId: 'p1' })
}));
const capabilities = vi.hoisted(() => ({ loadCapabilities: vi.fn() }));
vi.mock('#lib/server/capabilities.ts', () => capabilities);

import { failFromGo } from '#lib/server/form-action.ts';
import { readGoFailure } from '#lib/server/go.ts';
import { scopeFingerprint } from '#lib/server/scope.ts';
import { actions as profileActions } from '../../../src/routes/(app)/settings/account/profile/+page.server.ts';
import { actions as newRoleActions } from '../../../src/routes/(app)/settings/roles/new/+page.server.ts';

const RAW = 'pq: duplicate key value violates unique constraint "roles_name_key"';
const goError = (status: number, body: Record<string, unknown>) =>
	Promise.resolve(
		new Response(JSON.stringify({ type: 'x', title: 't', status, ...body }), {
			status,
			headers: { 'content-type': 'application/json' }
		})
	);

afterEach(() => vi.unstubAllGlobals());

describe('readGoFailure', () => {
	it("returns the status and Go's per-field text, and nothing else: Go's own text never leaves", async () => {
		const r = await readGoFailure(
			await goError(422, {
				error: 'validation_failed',
				detail: RAW,
				errors: { name: ['name is taken'] }
			})
		);
		expect(r).toEqual({
			status: 422,
			fields: { name: 'name is taken' },
			code: 'validation_failed'
		});
		expect(JSON.stringify(r)).not.toContain('pq:');
	});

	it('maps an unfollowed 3xx to 502 like goErrorStatus', async () => {
		const r = await readGoFailure(new Response(null, { status: 302 }));
		expect(r.status).toBe(502);
	});
});

describe('failFromGo: one banner KEY per status class, never English', () => {
	it.each([
		[403, 'forbidden', 'errors.code.forbidden'],
		[404, 'gone', 'auth.errors.notFound'],
		[409, 'new_code', 'auth.errors.conflict'],
		[429, 'rate_limited', 'auth.errors.rateLimited'],
		[422, 'whatever', 'auth.errors.validation'],
		[500, 'internal_error', 'auth.errors.unexpected']
	])('%i -> %s', async (status, error, key) => {
		const r = (await failFromGo(await goError(status, { error, detail: RAW }), { a: 1 })) as {
			status: number;
			data: Record<string, unknown>;
		};
		expect(r.status).toBe(status);
		expect(r.data).toEqual({
			values: { a: 1 },
			fieldKeys: {},
			fieldMessages: {},
			formErrorKey: key
		});
		expect(JSON.stringify(r)).not.toContain('pq:');
	});

	it("Go's per-field text goes to fieldMessages with no banner", async () => {
		const r = (await failFromGo(
			await goError(422, { error: 'validation_failed', errors: { name: ['too long'] } }),
			{ a: 1 }
		)) as { data: Record<string, unknown> };
		expect(r.data).toMatchObject({ fieldMessages: { name: 'too long' }, formErrorKey: null });
	});
});

describe('actions that used to print Go detail raw', () => {
	const cookies = (values: Record<string, string>) =>
		({ get: (n: string) => values[n], set: vi.fn(), delete: vi.fn() }) as never;
	type Fail = {
		status: number;
		data: { formErrorKey?: string | null; fieldMessages?: Record<string, unknown> };
	};

	it('profile: a Go 500 with raw detail shows a generic banner, never the detail', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => goError(500, { error: 'internal_error', detail: RAW }))
		);
		const r = (await (profileActions.default as (e: never) => Promise<unknown>)({
			request: new Request('http://x/', {
				method: 'POST',
				body: new URLSearchParams({ designation: 'a', department: 'b', status_message: 'c' })
			}),
			cookies: cookies({ lk_access: 'tok' })
		} as never)) as Fail;
		expect(r.status).toBe(500);
		expect(r.data.formErrorKey).toBe('auth.errors.unexpected');
		expect(JSON.stringify(r)).not.toContain('pq:');
	});

	it('profile: blank fields are sent as empty strings, never omitted (Go replaces the whole profile)', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
		vi.stubGlobal('fetch', fetchFn);
		const r = await (profileActions.default as (e: never) => Promise<unknown>)({
			request: new Request('http://x/', { method: 'POST', body: new URLSearchParams({}) }),
			cookies: cookies({ lk_access: 'tok' })
		} as never);
		expect(r).toEqual({ success: true });
		const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1];
		expect(JSON.parse(String(init.body))).toEqual({
			designation: '',
			department: '',
			status_message: ''
		});
	});

	it('profile: 422 field errors still reach the fields', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				goError(422, { error: 'validation_failed', errors: { designation: ['too long'] } })
			)
		);
		const r = (await (profileActions.default as (e: never) => Promise<unknown>)({
			request: new Request('http://x/', {
				method: 'POST',
				body: new URLSearchParams({ designation: 'a', department: 'b', status_message: 'c' })
			}),
			cookies: cookies({ lk_access: 'tok' })
		} as never)) as Fail;
		expect(r.status).toBe(422);
		expect(r.data.fieldMessages).toEqual({ designation: 'too long' });
	});

	it('new role: a 409 role_name_taken says so (its table key), never the raw detail', async () => {
		capabilities.loadCapabilities.mockResolvedValue({
			is_platform: false,
			is_super_user: true,
			permissions: [],
			effective_permissions: ['identity.roles.create']
		});
		vi.stubGlobal(
			'fetch',
			vi.fn(() => goError(409, { error: 'role_name_taken', detail: RAW }))
		);
		const r = (await (newRoleActions.default as (e: never) => Promise<unknown>)({
			request: new Request('http://x/', {
				method: 'POST',
				body: new URLSearchParams({
					name: 'Auditor',
					hierarchy_level: '5',
					scope_context: scopeFingerprint({ state: 'none' }, cookies({ lk_access: 'tok' }))
				})
			}),
			cookies: cookies({ lk_access: 'tok' }),
			route: { id: '/(app)/settings/roles/new' }
		} as never)) as Fail;
		expect(r.status).toBe(409);
		expect(r.data.formErrorKey).toBe('errors.code.role_name_taken');
	});

	it('new role: a 403 insufficient_rank says what to fix (its own table key), not the generic forbidden', async () => {
		capabilities.loadCapabilities.mockResolvedValue({
			is_platform: false,
			is_super_user: true,
			permissions: [],
			effective_permissions: ['identity.roles.create']
		});
		vi.stubGlobal(
			'fetch',
			vi.fn(() => goError(403, { error: 'insufficient_rank', detail: RAW }))
		);
		const r = (await (newRoleActions.default as (e: never) => Promise<unknown>)({
			request: new Request('http://x/', {
				method: 'POST',
				body: new URLSearchParams({
					name: 'Auditor',
					hierarchy_level: '5',
					scope_context: scopeFingerprint({ state: 'none' }, cookies({ lk_access: 'tok' }))
				})
			}),
			cookies: cookies({ lk_access: 'tok' }),
			route: { id: '/(app)/settings/roles/new' }
		} as never)) as Fail;
		expect(r.data.formErrorKey).toBe('errors.code.insufficient_rank');
	});
});

describe('form actions keep the form on an outage and share one 429 line', () => {
	const cookies = {
		get: (n: string) => (n === 'lk_access' ? 'tok' : undefined),
		set: vi.fn(),
		delete: vi.fn()
	} as never;
	type Out = { status: number; data: { values?: unknown; formErrorKey?: string } };
	const profile = () =>
		(profileActions.default as (e: never) => Promise<unknown>)({
			request: new Request('http://x/', {
				method: 'POST',
				body: new URLSearchParams({ designation: 'a', department: 'b', status_message: 'c' })
			}),
			cookies
		} as never) as Promise<Out>;
	const newRole = () => {
		capabilities.loadCapabilities.mockResolvedValue({
			is_platform: false,
			is_super_user: true,
			permissions: [],
			effective_permissions: ['identity.roles.create']
		});
		return (newRoleActions.default as (e: never) => Promise<unknown>)({
			request: new Request('http://x/', {
				method: 'POST',
				body: new URLSearchParams({
					name: 'Auditor',
					hierarchy_level: '5',
					scope_context: scopeFingerprint({ state: 'none' }, cookies)
				})
			}),
			cookies,
			route: { id: '/(app)/settings/roles/new' }
		} as never) as Promise<Out>;
	};

	it.each([
		['profile', profile],
		['new role', newRole]
	])('%s: a transport failure returns the kept form, not the error page', async (_n, run) => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new TypeError('fetch failed')))
		);
		const r = await run();
		expect(r.status).toBe(502);
		expect(r.data.formErrorKey).toBe('auth.errors.upstreamUnavailable');
		expect(r.data.values).toBeTruthy();
	});

	it.each([
		['profile', profile],
		['new role', newRole]
	])('%s: Go 429 uses the shared rate-limited key', async (_n, run) => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => goError(429, { error: 'rate_limited' }))
		);
		const r = await run();
		expect(r.status).toBe(429);
		expect(r.data.formErrorKey).toBe('auth.errors.rateLimited');
	});
});
