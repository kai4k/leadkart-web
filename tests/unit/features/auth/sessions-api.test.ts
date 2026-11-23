/**
 * "Sign out other devices" must keep THIS device: the request carries `except_current: true`. Without the flag
 * (or with false) Go revokes every session, this one included.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { revokeOtherSessions } from '#lib/features/auth/api.ts';

afterEach(() => vi.unstubAllGlobals());

describe('revokeOtherSessions', () => {
	it('DELETEs /v1/auth/sessions with except_current: true (and a reason)', async () => {
		const fetchMock = vi.fn().mockImplementation(() =>
			Promise.resolve(
				new Response(JSON.stringify({ revoked_count: 2 }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
			)
		);
		vi.stubGlobal('fetch', fetchMock);
		const res = await revokeOtherSessions('user_revoked_others');
		expect(res.revoked_count).toBe(2);
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe('/api/v1/auth/sessions');
		expect(init.method).toBe('DELETE');
		expect(JSON.parse(String(init.body))).toEqual({
			except_current: true,
			reason: 'user_revoked_others'
		});
	});
});
