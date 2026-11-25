import { error } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadCapabilities = vi.hoisted(() => vi.fn());
const goFetch = vi.hoisted(() => vi.fn());
const readGoJson = vi.hoisted(() => vi.fn());
const scopeState = vi.hoisted(() => ({ state: 'none' }));

vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
vi.mock('#lib/server/scope.ts', () => ({
	readOperatorScope: () => scopeState,
	scopeFingerprint: (r: { state: string }) => r.state
}));
vi.mock('#lib/server/go.ts', () => ({
	goFetch,
	readGoJson,
	readGoFailure: vi.fn()
}));

import { actions } from '../../../src/routes/(app)/settings/roles/new/+page.server.ts';

const event = (ctx = 'none') =>
	({
		request: new Request('http://x/settings/roles/new', {
			method: 'POST',
			body: new URLSearchParams({ name: 'Auditor', hierarchy_level: '5', scope_context: ctx })
		}),
		cookies: { get: () => 'tok' },
		route: { id: '/(app)/settings/roles/new' }
	}) as never;

const run = (ctx?: string) => (actions.default as (e: never) => Promise<unknown>)(event(ctx));

beforeEach(() => vi.clearAllMocks());

describe('create-role action authorisation', () => {
	it('refuses a user without identity.roles.create (403, form kept) and never calls Go', async () => {
		loadCapabilities.mockResolvedValue({
			is_platform: false,
			is_super_user: false,
			permissions: ['identity.roles.view'],
			effective_permissions: ['identity.roles.view']
		});
		await expect(run()).resolves.toMatchObject({
			status: 403,
			data: {
				values: { name: 'Auditor', hierarchy_level: 5 },
				formErrorKey: 'auth.errors.forbidden'
			}
		});
		expect(goFetch).not.toHaveBeenCalled();
	});

	it('sends the user to sign-in when capabilities cannot be loaded, without calling Go', async () => {
		loadCapabilities.mockResolvedValue(null);
		await expect(run()).rejects.toMatchObject({ status: 303, location: '/signin' });
		expect(goFetch).not.toHaveBeenCalled();
	});

	it('lets a user with the permission through to the create call', async () => {
		loadCapabilities.mockResolvedValue({
			is_platform: false,
			is_super_user: false,
			permissions: ['identity.roles.create'],
			effective_permissions: ['identity.roles.create']
		});
		goFetch.mockResolvedValue({ ok: false, status: 500 });
		await run().catch(() => undefined);
		expect(goFetch).toHaveBeenCalledTimes(1);
	});
});

// input-audit-identity C5: `Number()` read `1e1` as 10 and `0x10` as 16; the level is digits only.
describe('the hierarchy level is digits only, or no role is created', () => {
	const post = (level: string) =>
		(actions.default as (e: never) => Promise<unknown>)({
			request: new Request('http://x/settings/roles/new', {
				method: 'POST',
				body: new URLSearchParams({
					name: 'Auditor',
					hierarchy_level: level,
					scope_context: 'none'
				})
			}),
			cookies: { get: () => 'tok' },
			route: { id: '/(app)/settings/roles/new' }
		} as never);
	beforeEach(() =>
		loadCapabilities.mockResolvedValue({
			is_platform: false,
			is_super_user: false,
			permissions: [],
			effective_permissions: ['identity.roles.create']
		})
	);

	it.each(['1e1', '0x10', 'abc', '', ' 5', '5.0', '+5', '-5'])(
		'%j is a validation failure on the level and Go is not called',
		async (typed) => {
			const r = (await post(typed)) as {
				status: number;
				data: { fieldMessages: Record<string, string> };
			};
			expect(r.status).toBe(422);
			expect(r.data.fieldMessages).toEqual({ hierarchy_level: 'form.errors.levelInvalid' });
			expect(goFetch).not.toHaveBeenCalled();
		}
	);

	it('digits reach Go as the number they spell', async () => {
		goFetch.mockResolvedValue({ ok: false, status: 500 });
		await post('10').catch(() => undefined);
		expect(goFetch).toHaveBeenCalledTimes(1);
		expect(JSON.parse(String((goFetch.mock.calls[0][2] as { body: string }).body))).toEqual({
			name: 'Auditor',
			hierarchy_level: 10
		});
	});
});

describe('create-role action: where a created role lands', () => {
	const created = () => {
		goFetch.mockResolvedValue({ ok: true, status: 201 });
		readGoJson.mockResolvedValue({ role_id: 'r/1 x' });
	};

	it('an operator acting inside a company lands on the role page in the scope tree', async () => {
		loadCapabilities.mockResolvedValue({
			is_platform: true,
			is_super_user: false,
			permissions: [],
			effective_permissions: ['platform.roles.manage']
		});
		scopeState.state = 'valid';
		created();
		try {
			await expect(run('valid')).rejects.toMatchObject({
				status: 303,
				location: `/operator/scope/roles/${encodeURIComponent('r/1 x')}`
			});
		} finally {
			scopeState.state = 'none';
		}
	});

	it('outside a tenant context it lands on the own-tenant role page', async () => {
		loadCapabilities.mockResolvedValue({
			is_platform: true,
			is_super_user: false,
			permissions: [],
			effective_permissions: ['platform.roles.manage']
		});
		created();
		await expect(run()).rejects.toMatchObject({
			status: 303,
			location: `/settings/roles/${encodeURIComponent('r/1 x')}`
		});
	});
});

describe('create-role action keeps the form on an outage', () => {
	const allowed = () =>
		loadCapabilities.mockResolvedValue({
			is_platform: false,
			is_super_user: false,
			permissions: [],
			effective_permissions: ['identity.roles.create']
		});

	it('a 503 while reading capabilities is a kept-form failure, not an error page', async () => {
		loadCapabilities.mockImplementation(() => Promise.reject(error(503, 'down')));
		await expect(run()).resolves.toMatchObject({
			status: 503,
			data: {
				values: { name: 'Auditor', hierarchy_level: 5 },
				formErrorKey: 'auth.errors.upstreamUnavailable'
			}
		});
		expect(goFetch).not.toHaveBeenCalled();
	});

	it('a transport failure on the create call keeps the form', async () => {
		allowed();
		goFetch.mockImplementation(() => Promise.reject(new TypeError('fetch failed')));
		await expect(run()).resolves.toMatchObject({
			status: 502,
			data: { formErrorKey: 'auth.errors.upstreamUnavailable' }
		});
	});

	it('a stalled response body keeps the form too', async () => {
		allowed();
		goFetch.mockResolvedValue({ ok: true, status: 201 });
		readGoJson.mockImplementation(() => Promise.reject(new TypeError('terminated')));
		await expect(run()).resolves.toMatchObject({
			status: 502,
			data: { formErrorKey: 'auth.errors.upstreamUnavailable' }
		});
	});

	it('refuses in a tenant context: the create would land in the scoped tenant', async () => {
		allowed();
		scopeState.state = 'valid';
		await expect(run('valid')).resolves.toMatchObject({ status: 403 });
		expect(goFetch).not.toHaveBeenCalled();
		scopeState.state = 'none';
	});
});
