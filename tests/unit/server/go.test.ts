import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { goFetch } from '#lib/server/go.ts';

function jar(values: Record<string, string>): Cookies {
	const store = new Map(Object.entries(values));
	return {
		get: (n: string) => store.get(n),
		set: (n: string, v: string) => void store.set(n, v),
		delete: (n: string) => void store.delete(n),
		getAll: () => [],
		serialize: () => ''
	} as unknown as Cookies;
}

afterEach(() => vi.unstubAllGlobals());

describe('goFetch', () => {
	it('drops a caller-supplied X-Tenant-Id (any case) and never follows redirects', async () => {
		const fetchFn = vi.fn((_url: string, _init: RequestInit) =>
			Promise.resolve(new Response('{}', { status: 200 }))
		);
		vi.stubGlobal('fetch', fetchFn);

		await goFetch(jar({ lk_access: 'tok' }), '/v1/users', {
			headers: { 'X-Tenant-Id': 'attacker', 'x-TENANT-id': 'attacker2', 'x-other': 'keep' }
		});

		const init = fetchFn.mock.calls[0][1];
		expect(init.redirect).toBe('manual');
		const sent = Object.fromEntries(
			Object.entries(init.headers as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v])
		);
		expect(sent['x-tenant-id']).toBeUndefined();
		expect(sent['x-other']).toBe('keep');
		expect(sent['authorization']).toBe('Bearer tok');
	});

	it('answers 503 (not a 401 the caller would read as signed-out) when the refresh cannot reach Go', async () => {
		const fetchFn = vi.fn((url: string) =>
			url.endsWith('/auth/refresh')
				? Promise.reject(new TypeError('fetch failed'))
				: Promise.resolve(
						new Response('{}', { status: 401, headers: { 'www-authenticate': 'Bearer' } })
					)
		);
		vi.stubGlobal('fetch', fetchFn);
		const cookies = jar({ lk_access: 'old', lk_refresh: 'unavail-refresh' });

		await expect(goFetch(cookies, '/v1/users')).rejects.toMatchObject({ status: 503 });
		expect(cookies.get('lk_refresh')).toBe('unavail-refresh');
	});
});
