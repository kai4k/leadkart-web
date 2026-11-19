import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/api/jwt.ts', () => ({ decodeJwtPrincipal: () => ({ membershipId: 'm1' }) }));
vi.mock('#lib/api/jwt', () => ({ decodeJwtPrincipal: () => ({ membershipId: 'm1' }) }));
const capabilities = vi.hoisted(() => ({ loadCapabilities: vi.fn() }));
vi.mock('#lib/server/capabilities.ts', () => capabilities);

import { readGoFailure } from '#lib/server/go.ts';
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
	it("never returns Go's text: a code with allowlisted copy gets it, any other code the generic line", async () => {
		const known = await readGoFailure(
			await goError(409, { error: 'role_system_default', detail: RAW })
		);
		expect(known.message).toBe("Built-in roles can't be changed or deleted.");
		const unknown = await readGoFailure(await goError(409, { error: 'new_code', detail: RAW }));
		expect(unknown.message).toBe(
			'This change conflicts with the current state. Refresh and try again.'
		);
		const forbidden = await readGoFailure(await goError(403, { error: 'weird', detail: RAW }));
		expect(forbidden.message).toBe("You don't have permission to do this.");
		expect(JSON.stringify([known, unknown, forbidden])).not.toContain('pq:');
	});

	it("the caller's line for the status wins over the generic one; fields keep Go's per-field text", async () => {
		const r = await readGoFailure(
			await goError(422, { error: 'validation_failed', errors: { name: ['name is taken'] } }),
			{ status: { 422: 'Fix the form.' } }
		);
		expect(r.status).toBe(422);
		expect(r.fields).toEqual({ name: 'name is taken' });
		const own = await readGoFailure(await goError(404, { error: 'gone', detail: RAW }), {
			status: { 404: 'That role was deleted.' }
		});
		expect(own.message).toBe('That role was deleted.');
	});

	it('maps an unfollowed 3xx to 502 like goErrorStatus', async () => {
		const r = await readGoFailure(new Response(null, { status: 302 }));
		expect(r.status).toBe(502);
	});
});

describe('actions that used to print Go detail raw', () => {
	const cookies = (values: Record<string, string>) =>
		({ get: (n: string) => values[n], set: vi.fn(), delete: vi.fn() }) as never;
	type Fail = { status: number; data: { bannerError?: string; errors?: Record<string, unknown> } };

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
		expect(r.data.bannerError).toBeTruthy();
		expect(r.data.bannerError).not.toContain('pq:');
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
		expect(r.data.errors).toEqual({ designation: 'too long' });
	});

	it('new role: a 409 with raw detail shows the generic conflict line', async () => {
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
				body: new URLSearchParams({ name: 'Auditor', hierarchy_level: '5' })
			}),
			cookies: cookies({ lk_access: 'tok' })
		} as never)) as Fail;
		expect(r.status).toBe(409);
		expect(r.data.bannerError).toBe(
			'This change conflicts with the current state. Refresh and try again.'
		);
	});

	it('new role: the insufficient_rank code gets its own copy', async () => {
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
				body: new URLSearchParams({ name: 'Auditor', hierarchy_level: '5' })
			}),
			cookies: cookies({ lk_access: 'tok' })
		} as never)) as Fail;
		expect(r.data.bannerError).toBe('You can only make this change for people below your level.');
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
				body: new URLSearchParams({ name: 'Auditor', hierarchy_level: '5' })
			}),
			cookies
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
