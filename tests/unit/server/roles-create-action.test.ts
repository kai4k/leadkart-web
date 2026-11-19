import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadCapabilities = vi.hoisted(() => vi.fn());
const goFetch = vi.hoisted(() => vi.fn());

vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
vi.mock('#lib/server/go.ts', () => ({
	goFetch,
	readGoJson: vi.fn(),
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
	it('redirects a user without identity.roles.create and never calls Go', async () => {
		loadCapabilities.mockResolvedValue({
			is_platform: false,
			is_super_user: false,
			permissions: ['identity.roles.view']
		});
		await expect(run()).rejects.toMatchObject({ status: 303, location: '/dashboard' });
		expect(goFetch).not.toHaveBeenCalled();
	});

	it('redirects when capabilities cannot be loaded', async () => {
		loadCapabilities.mockResolvedValue(null);
		await expect(run()).rejects.toMatchObject({ status: 303 });
		expect(goFetch).not.toHaveBeenCalled();
	});

	it('lets a user with the permission through to the create call', async () => {
		loadCapabilities.mockResolvedValue({
			is_platform: false,
			is_super_user: false,
			permissions: ['identity.roles.create']
		});
		goFetch.mockResolvedValue({ ok: false, status: 500 });
		await run().catch(() => undefined);
		expect(goFetch).toHaveBeenCalledTimes(1);
	});
});
