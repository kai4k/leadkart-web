/**
 * Signing out changes the person the browser holds: the other tabs must reload instead of collecting
 * 409s, so a sign-out announces on the channel the context changes use (only once the BFF ended it).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const logoutRequest = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const announce = vi.hoisted(() => vi.fn());
vi.mock('$app/state', () => ({ page: { data: {} } }));
vi.mock('#lib/features/auth/api.ts', () => ({ logout: logoutRequest }));
vi.mock('#lib/api/operator-scope.ts', () => ({ announceContextChange: announce }));
vi.mock('#lib/api/query-client.ts', () => ({ clearUserBrowserState: vi.fn() }));

import { session } from '#lib/features/auth/stores/session.svelte.ts';

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('location', { href: '/dashboard' });
});

describe('session.logout', () => {
	it('announces to the other tabs after the sign-out succeeded', async () => {
		await session.logout();
		expect(announce).toHaveBeenCalledTimes(1);
		expect(announce).toHaveBeenCalledWith('session');
		expect(logoutRequest.mock.invocationCallOrder[0]).toBeLessThan(
			announce.mock.invocationCallOrder[0]!
		);
	});

	it('does not announce when the sign-out call failed (the session is still there)', async () => {
		logoutRequest.mockRejectedValueOnce(new Error('offline'));
		await expect(session.logout()).rejects.toThrow('offline');
		expect(announce).not.toHaveBeenCalled();
	});
});
