import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logout } from '#lib/features/auth/api.ts';

describe('logout() (what the error page sign-out calls with JavaScript)', () => {
	beforeEach(() => {
		document.cookie = 'lk_csrf=tok%2B1; path=/';
	});
	afterEach(() => {
		document.cookie = 'lk_csrf=; Max-Age=0; path=/';
		vi.unstubAllGlobals();
	});

	it('POSTs /auth/logout with the CSRF cookie echoed in X-CSRF-Token (decoded like every other caller)', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(new Response('{}')));
		vi.stubGlobal('fetch', fetchFn);
		await logout();
		const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/auth/logout');
		expect(init.method).toBe('POST');
		expect((init.headers as Record<string, string>)['x-csrf-token']).toBe('tok+1');
	});
});
