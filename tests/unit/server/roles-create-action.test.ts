import { error } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadCapabilities = vi.hoisted(() => vi.fn());
const goFetch = vi.hoisted(() => vi.fn());
const readGoJson = vi.hoisted(() => vi.fn());
const scopeState = vi.hoisted(() => ({ state: 'none' }));

vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
vi.mock('#lib/server/scope.ts', () => ({ readOperatorScope: () => scopeState }));
vi.mock('#lib/server/go.ts', () => ({
	goFetch,
	readGoJson,
	readGoFailure: vi.fn()
}));

import { actions } from '../../../src/routes/(app)/settings/roles/new/+page.server.ts';

const event = () =>
	({
		request: new Request('http://x/settings/roles/new', {
			method: 'POST',
			body: new URLSearchParams({ name: 'Auditor', hierarchy_level: '5' })
		}),
		cookies: {}
	}) as never;

const run = () => (actions.default as (e: never) => Promise<unknown>)(event());

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
		await expect(run()).resolves.toMatchObject({ status: 403 });
		expect(goFetch).not.toHaveBeenCalled();
		scopeState.state = 'none';
	});
});
