/**
 * Service-worker caches that hold authenticated data (SSR navigations and
 * /api GET JSON). They must not outlive the identity or tenant context that
 * filled them: clear on logout, session end and operator scope change.
 *
 * This file is the ONE source of the cache-name prefixes: the service worker
 * builds `${PREFIX}${version}` from them and the page matches by prefix (so
 * caches of older versions are cleared too). The app-shell precache is public
 * build output and is kept.
 */
export const RUNTIME_CACHE_PREFIX = 'lk-runtime-';
export const API_CACHE_PREFIX = 'lk-api-';
export const CLEAR_PRIVATE_CACHES_MESSAGE = 'CLEAR_PRIVATE_CACHES';

/**
 * Which `/api` GET responses the service worker may keep for offline reading:
 * JSON only, never auth/capability responses and never downloads (CSV exports
 * carry whole datasets of personal data).
 */
export function isCacheableApiResponse(url: URL, response: Response): boolean {
	if (url.pathname.startsWith('/api/v1/auth/')) return false;
	if (response.headers.has('content-disposition')) return false;
	return (response.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');
}

const isPrivateCache = (name: string): boolean =>
	name.startsWith(RUNTIME_CACHE_PREFIX) || name.startsWith(API_CACHE_PREFIX);

/** Delete private caches from the page and ask the service worker to do the same. */
export async function clearPrivateCaches(): Promise<void> {
	if (typeof navigator !== 'undefined') {
		navigator.serviceWorker?.controller?.postMessage({ type: CLEAR_PRIVATE_CACHES_MESSAGE });
	}
	if (typeof caches === 'undefined') return;
	try {
		const names = await caches.keys();
		await Promise.all(names.filter(isPrivateCache).map((n) => caches.delete(n)));
	} catch {
		// Cache Storage can be unavailable (private mode); clearing is best-effort.
	}
}
