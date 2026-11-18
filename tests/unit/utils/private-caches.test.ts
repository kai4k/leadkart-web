import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	API_CACHE_PREFIX,
	CLEAR_PRIVATE_CACHES_MESSAGE,
	RUNTIME_CACHE_PREFIX,
	clearPrivateCaches,
	isCacheableApiResponse
} from '#lib/utils/private-caches.ts';

function stubCaches(keys: string[]) {
	const deleted: string[] = [];
	vi.stubGlobal('caches', {
		keys: vi.fn(() => Promise.resolve(keys)),
		delete: vi.fn((n: string) => {
			deleted.push(n);
			return Promise.resolve(true);
		})
	});
	return deleted;
}

describe('clearPrivateCaches', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('deletes runtime + api caches of every version, keeps the app shell', async () => {
		const deleted = stubCaches([
			`${RUNTIME_CACHE_PREFIX}v1`,
			`${API_CACHE_PREFIX}v1`,
			`${API_CACHE_PREFIX}v0`,
			'lk-shell-v1',
			'other'
		]);
		await clearPrivateCaches();
		expect(deleted.sort()).toEqual(
			[`${API_CACHE_PREFIX}v0`, `${API_CACHE_PREFIX}v1`, `${RUNTIME_CACHE_PREFIX}v1`].sort()
		);
	});

	it('tells the controlling service worker to clear too', async () => {
		stubCaches([]);
		const postMessage = vi.fn();
		vi.stubGlobal('navigator', { serviceWorker: { controller: { postMessage } } });
		await clearPrivateCaches();
		expect(postMessage).toHaveBeenCalledWith({ type: CLEAR_PRIVATE_CACHES_MESSAGE });
	});

	it('works with no service worker controller and swallows cache errors', async () => {
		vi.stubGlobal('navigator', { serviceWorker: { controller: null } });
		vi.stubGlobal('caches', {
			keys: vi.fn(() => Promise.reject(new Error('denied')))
		});
		await expect(clearPrivateCaches()).resolves.toBeUndefined();
	});

	it('is a no-op where Cache Storage is unavailable', async () => {
		vi.stubGlobal('caches', undefined);
		await expect(clearPrivateCaches()).resolves.toBeUndefined();
	});
});

describe('isCacheableApiResponse', () => {
	const json = (init: Record<string, string> = {}) =>
		new Response('{}', { headers: { 'content-type': 'application/json; charset=utf-8', ...init } });
	const url = (path: string) => new URL(path, 'https://app.test');

	it('accepts a plain JSON list response', () => {
		expect(isCacheableApiResponse(url('/api/v1/crm/leads?page=1'), json())).toBe(true);
	});

	it('rejects auth and capability responses', () => {
		expect(isCacheableApiResponse(url('/api/v1/auth/me/capabilities'), json())).toBe(false);
		expect(isCacheableApiResponse(url('/api/v1/auth/sessions'), json())).toBe(false);
	});

	it('rejects downloads (content-disposition) even when JSON', () => {
		expect(
			isCacheableApiResponse(
				url('/api/v1/crm/leads/export'),
				json({ 'content-disposition': 'attachment' })
			)
		).toBe(false);
	});

	it('rejects non-JSON bodies such as CSV', () => {
		const csv = new Response('a,b', { headers: { 'content-type': 'text/csv' } });
		expect(isCacheableApiResponse(url('/api/v1/crm/leads'), csv)).toBe(false);
		expect(isCacheableApiResponse(url('/api/v1/crm/leads'), new Response('x'))).toBe(false);
	});
});
