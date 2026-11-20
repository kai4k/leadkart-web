import { describe, expect, it, vi } from 'vitest';
import { refreshSession } from '#lib/server/auth-refresh.ts';
import { changePasswordViaGo } from '#lib/server/auth-errors.ts';
import { callGoForAction } from '#lib/server/form-action.ts';
import { goFetch } from '#lib/server/go.ts';
import { CSRF_COOKIE, REFRESH_COOKIE } from '#lib/server/cookies.ts';

/** A cookie jar that honours `delete` (the stubs elsewhere only record it). */
function realJar(initial: Record<string, string>) {
	const store = new Map(Object.entries(initial));
	return {
		get: (name: string) => store.get(name),
		set: (name: string, value: string) => void store.set(name, value),
		delete: (name: string) => void store.delete(name),
		names: () => [...store.keys()]
	};
}

describe('a session ended by a rejected refresh', () => {
	// The hook refreshes an expired access cookie before any action runs. When Go rejects the
	// refresh token, the cookies are cleared and the action that follows must send the user to
	// sign-in, not turn it into a "service unreachable" form failure.
	const rejected = vi.fn(() => Promise.resolve(new Response('{}', { status: 401 })));

	it('the hook clears every auth cookie when the refresh is rejected', async () => {
		const jar = realJar({ [REFRESH_COOKIE]: 'rt', [CSRF_COOKIE]: 'c' });
		const r = await refreshSession(jar as never, rejected as never);
		expect(r).toEqual({ ok: false, reason: 'rejected' });
		expect(jar.get(REFRESH_COOKIE)).toBeUndefined();
	});

	it('the next Go call of an action redirects to /signin and is not swallowed as an outage', async () => {
		const jar = realJar({ [REFRESH_COOKIE]: 'rt', [CSRF_COOKIE]: 'c' });
		await refreshSession(jar as never, rejected as never);
		await expect(
			callGoForAction(() => goFetch(jar as never, '/v1/roles', { method: 'GET' }))
		).rejects.toMatchObject({ status: 303, location: '/signin' });
	});

	it('the change-password action redirects to /signin too', async () => {
		const jar = realJar({ [REFRESH_COOKIE]: 'rt', [CSRF_COOKIE]: 'c' });
		await refreshSession(jar as never, rejected as never);
		await expect(
			changePasswordViaGo(jar as never, {
				current: 'Old-password-1!',
				next: 'New-password-2!x',
				confirm: 'New-password-2!x'
			})
		).rejects.toMatchObject({ status: 303, location: '/signin' });
	});
});
