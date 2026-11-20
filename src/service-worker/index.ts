/**
 * LeadKart service worker.
 *
 * Three concerns:
 *
 * 1. **App-shell precache** — every build, the static SvelteKit build
 *    output is pre-cached so the app boots offline. SvelteKit's
 *    `$app/manifest` exposes the build + static asset lists and
 *    `$app/env` the versioned cache name.
 *
 * 2. **Runtime caching** (this is everything it ever writes):
 *    - Build chunks / static assets → CacheFirst (immutable hashes).
 *    - Static images → StaleWhileRevalidate (public files).
 *    - NOT stored, ever: HTML navigations and `__data.json` of signed-in routes (capabilities,
 *      tenant data, the CSRF value: the Cache API ignores `no-store`, so the only safe copy is
 *      none). A navigation is network-only; offline it shows the precached static
 *      `/offline.html`.
 *    - `/api/*` is NOT intercepted at all. API JSON is the tenant's data (users, roles, leads,
 *      orders, inventory, audit...); the Cache API is keyed by URL only (no user, no tenant), sits on
 *      disk, and would have to be cleared on every way a session or a context can end. Offline
 *      reading of it is not worth that, and answering from a cache when the network takes over 10 s
 *      is wrong for a proxied call that may legitimately take ~30 s (call, refresh, replay): an
 *      aborted refreshing call could lose the rotated cookies and end the session.
 *    - BFF auth (/auth/*) → not intercepted. Sessions must reach the origin server.
 *    Everything the worker stores is public build output or static images, so there is nothing
 *      private to clear on sign-out or a tenant-context change.
 *
 * 3. **Lifecycle**:
 *    - `install` → precache the shell. Then `skipWaiting` ONLY for the migration: when caches of a
 *      generation that stored private data are present (`lk-api-*`, the signed-in HTML of the
 *      `lk-runtime-*` of an older generation), the worker it replaces would keep answering from
 *      them, so this one takes over at once and `activate` purges them. Otherwise it WAITS, as a
 *      worker should: an open tab keeps the build it loaded (its precached chunks are not replaced
 *      under it) and the update prompt (`SKIP_WAITING` message) decides when to switch; an
 *      unconditional `skipWaiting` would make the prompt dead (it would post to an already-active
 *      worker and `controllerchange` would never fire again).
 *    - `activate` → delete every cache this worker does not own (older generations included: that
 *      is what purges `lk-api-v2-*` and the v2 runtime cache) and claim the open tabs.
 *    - `message` → SKIP_WAITING from the update-prompt UI.
 *
 * Industry refs: Workbox recipes, Stripe Dashboard SW, GitHub PWA SW,
 * SvelteKit "Service workers" docs.
 */
import { self } from '$app/service-worker';
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { asset, resolve } from '$app/paths';

/**
 * Part of every cache name the worker owns. Bump it whenever what the worker may store gets
 * narrower: the activating worker deletes every `lk*` cache that is not its own, so caches written
 * under the old rules (v1 stored signed-in HTML pages, v2 API JSON) are purged on upgrade.
 */
const CACHE_GENERATION = 'v3';
const CACHE_PREFIX = 'lk';
const APP_SHELL_CACHE = `${CACHE_PREFIX}-shell-${CACHE_GENERATION}-${version}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_GENERATION}-${version}`;
/** The static page an offline navigation shows (a file in `static/`, so it is in the precached shell). */
const OFFLINE_PAGE = asset('offline.html');

/**
 * `immutable` paths are plain build-output strings, not typed routes.
 * They are base-relative with no leading slash, so `resolve()` base-prefixes
 * them correctly. This assumes `paths.assets` is not configured; revisit if
 * a CDN asset prefix is added.
 */
const resolveBuildPath = resolve as (path: string) => string;

/** Files to precache on install — built assets + bundled statics. */
const APP_SHELL: string[] = [
	...immutable.map(({ path }) => resolveBuildPath(path)),
	...assets.map(({ path }) => asset(path))
];

/**
 * NOTE on how far this reaches. The detection runs ONCE, at install: a worker that is already
 * installed and in control keeps control (its old behaviour, the old private caches it owns) until
 * every tab it serves is closed, or until `skipWaiting` replaces it. A worker of an older generation
 * whose caches are empty therefore keeps serving after this build is deployed; that is acceptable
 * because `main` never shipped a service worker: no user holds a worker of an earlier generation, and
 * the generations this function names exist only on development and preview browsers.
 *
 * Is there a cache an earlier generation filled with private data (API JSON, signed-in HTML)? Then
 * the worker that owns it must be replaced now, not after the user accepts an update prompt. The
 * generations before this one: `lk-api-*` (API JSON) and `lk-runtime-*` without the current
 * generation (it held navigations). Public caches of an older build do not count.
 */
async function holdsPrivateData(): Promise<boolean> {
	const current = `${CACHE_PREFIX}-runtime-${CACHE_GENERATION}-`;
	return (await caches.keys()).some(
		(n) =>
			n.startsWith(`${CACHE_PREFIX}-api-`) ||
			(n.startsWith(`${CACHE_PREFIX}-runtime-`) && !n.startsWith(current))
	);
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(APP_SHELL_CACHE);
			await cache.addAll(APP_SHELL);
			if (await holdsPrivateData()) await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const expected = new Set([APP_SHELL_CACHE, RUNTIME_CACHE]);
			const names = await caches.keys();
			await Promise.all(
				names
					.filter((n) => n.startsWith(CACHE_PREFIX) && !expected.has(n))
					.map((n) => caches.delete(n))
			);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		void self.skipWaiting();
	}
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return; // mutations always reach origin
	const url = new URL(event.request.url);

	if (url.origin !== self.location.origin) return; // cross-origin: let browser handle
	if (url.pathname.startsWith('/auth/')) return; // auth flows must reach origin
	if (url.pathname.endsWith('/__data.json')) return; // a signed-in route's data: never stored

	if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return; // the tenant's data: never intercepted, never stored

	if (APP_SHELL.includes(url.pathname)) {
		event.respondWith(cacheFirst(event.request, APP_SHELL_CACHE));
		return;
	}

	if (url.pathname.startsWith('/images/') || url.pathname.endsWith('.svg')) {
		event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
		return;
	}

	if (event.request.mode === 'navigate') {
		event.respondWith(networkOnlyNavigate(event.request));
	}
});

async function cacheFirst(req: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(req);
	if (cached) return cached;
	const fresh = await fetch(req);
	if (fresh.ok) void cache.put(req, fresh.clone());
	return fresh;
}

async function staleWhileRevalidate(req: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(req);
	const networkPromise = fetch(req)
		.then((res) => {
			if (res.ok) void cache.put(req, res.clone());
			return res;
		})
		.catch(() => cached ?? Response.error());
	if (cached) return cached;
	return networkPromise;
}

/**
 * A navigation is a signed-in page (or a public one: they cannot be told apart here): always the
 * network, never written to a cache. Offline, the static offline page.
 */
async function networkOnlyNavigate(req: Request): Promise<Response> {
	try {
		return await fetch(req);
	} catch {
		const offline = await caches.match(OFFLINE_PAGE);
		return offline ?? Response.error();
	}
}

export {};
