/**
 * The sign-in page's load takes the notice ONCE: it hands the page a name from the fixed list (or
 * nothing) and deletes the cookie whatever it held, so a reload shows nothing.
 */
import { describe, expect, it, vi } from 'vitest';
import { load } from '../../../src/routes/(auth)/signin/+page.server.ts';
import { SIGNIN_NOTICES } from '#lib/api/signin-notice.ts';

function jar(values: Record<string, string> = {}) {
	const store = new Map(Object.entries(values));
	return {
		store,
		get: (n: string) => store.get(n),
		set: vi.fn(),
		delete: vi.fn((n: string, _opts: { path: string }) => void store.delete(n))
	};
}
const run = (cookies: ReturnType<typeof jar>) =>
	(load as (e: never) => unknown)({ cookies } as never) as { notice: string | null };

describe('signin load: the notice', () => {
	it.each(SIGNIN_NOTICES)('%s reaches the page once', (notice) => {
		const cookies = jar({ lk_signin_notice: notice });
		expect(run(cookies)).toEqual({ notice });
		expect(cookies.delete).toHaveBeenCalledExactlyOnceWith('lk_signin_notice', { path: '/signin' });
		// the reload: the cookie is gone, so is the sentence
		expect(run(cookies)).toEqual({ notice: null });
		expect(cookies.delete).toHaveBeenCalledTimes(1);
		expect(cookies.set).not.toHaveBeenCalled();
	});

	it.each(['idle_timeout', '<b>x</b>', 'eyJhbGciOiJIUzI1NiJ9.e30.sig', ''])(
		'an unknown value (%j) shows nothing and is deleted',
		(value) => {
			const cookies = jar({ lk_signin_notice: value });
			expect(run(cookies)).toEqual({ notice: null });
			expect(cookies.delete).toHaveBeenCalledExactlyOnceWith('lk_signin_notice', {
				path: '/signin'
			});
		}
	);

	it('no cookie: nothing shown, nothing written, and no other cookie is read into the page', () => {
		const cookies = jar({ lk_access: 'tok', lk_refresh: 'r', lk_csrf: 'c' });
		expect(run(cookies)).toEqual({ notice: null });
		expect(cookies.delete).not.toHaveBeenCalled();
		expect(cookies.set).not.toHaveBeenCalled();
	});
});
