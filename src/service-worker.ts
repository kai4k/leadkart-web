/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * LeadKart service worker.
 *
 * Three concerns:
 *
 * 1. **App-shell precache** — every build, the static SvelteKit build
 *    output is pre-cached so the app boots offline. SvelteKit's
 *    virtual `$service-worker` module exposes the manifest +
 *    versioned cache name.
 *
 * 2. **Runtime caching**:
 *    - Build chunks / static assets → CacheFirst (immutable hashes).
 *    - Static images → StaleWhileRevalidate.
 *    - API GETs (/api/v1/*) → NetworkFirst with 10s timeout, then
 *      cache fallback so the user sees stale-but-readable data when
 *      offline.
 *    - API mutations (POST/PUT/PATCH/DELETE) → NetworkOnly. Auth
 *      correctness > offline draft saves; queued mutations would
 *      reorder events and break the audit log.
 *    - BFF auth (/auth/*) → NetworkOnly. Sessions must reach the
 *      origin server; cached login responses are a security hole.
 *
 * 3. **Lifecycle**:
 *    - `install` → precache app shell, skipWaiting so the new SW takes
 *      over immediately on next reload.
 *    - `activate` → claim clients + delete old caches.
 *    - `message` → handle SKIP_WAITING from the update-prompt UI so
 *      the user can force-apply a pending update.
 *
 * Industry refs: Workbox recipes, Stripe Dashboard SW, GitHub PWA SW,
 * SvelteKit "Service workers" docs.
 */
import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE_PREFIX = 'lk';
const APP_SHELL_CACHE = `${CACHE_PREFIX}-shell-${version}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${version}`;
const API_CACHE = `${CACHE_PREFIX}-api-${version}`;

/** Files to precache on install — built assets + bundled statics. */
const APP_SHELL: string[] = [...build, ...files];

const API_TIMEOUT_MS = 10_000;

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(APP_SHELL_CACHE);
			await cache.addAll(APP_SHELL);
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const expected = new Set([APP_SHELL_CACHE, RUNTIME_CACHE, API_CACHE]);
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

	if (url.pathname.startsWith('/api/')) {
		event.respondWith(networkFirstApi(event.request));
		return;
	}

	if (APP_SHELL.includes(url.pathname)) {
		event.respondWith(cacheFirst(event.request, APP_SHELL_CACHE));
		return;
	}

	if (url.pathname.startsWith('/images/') || url.pathname.endsWith('.svg')) {
		event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
		return;
	}

	if (event.request.mode === 'navigate') {
		event.respondWith(networkFirstNavigate(event.request));
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

async function networkFirstApi(req: Request): Promise<Response> {
	const cache = await caches.open(API_CACHE);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
	try {
		const fresh = await fetch(req, { signal: controller.signal });
		clearTimeout(timeout);
		if (fresh.ok) void cache.put(req, fresh.clone());
		return fresh;
	} catch {
		clearTimeout(timeout);
		const cached = await cache.match(req);
		return cached ?? Response.error();
	}
}

async function networkFirstNavigate(req: Request): Promise<Response> {
	const cache = await caches.open(RUNTIME_CACHE);
	try {
		const fresh = await fetch(req);
		if (fresh.ok) void cache.put(req, fresh.clone());
		return fresh;
	} catch {
		const cached = await cache.match(req);
		if (cached) return cached;
		const offline = await caches.match('/');
		return offline ?? Response.error();
	}
}

export {};
