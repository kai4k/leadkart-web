import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	API_CACHE_PREFIX,
	CLEAR_PRIVATE_CACHES_MESSAGE,
	RUNTIME_CACHE_PREFIX,
	clearPrivateCaches
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
