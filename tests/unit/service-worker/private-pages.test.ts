/**
 * What the service worker stores. The real worker module runs against a fake worker scope, a fake
 * Cache Storage and a fake network. Authenticated pages (HTML navigations, `__data.json`) carry the
 * capabilities, tenant data and the CSRF value, and `/api` JSON carries the tenant's data (users,
 * roles, leads, orders...): the Cache API ignores `no-store` and is keyed by URL only (no user, no
 * tenant), so the worker never writes any of it and does not intercept `/api` at all. What it keeps:
 * the build output and static files (public, precached) and static images (public).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (event: unknown) => void;
const sw = vi.hoisted(() => ({
	handlers: {} as Record<string, Handler>,
	lifecycle: [] as string[]
}));
vi.mock('$app/service-worker', () => ({
	self: {
		location: { origin: 'https://app.test' },
		addEventListener: (type: string, h: Handler) => void (sw.handlers[type] = h),
		skipWaiting: () => {
			sw.lifecycle.push('skipWaiting');
			return Promise.resolve();
		},
		clients: {
			claim: () => {
				sw.lifecycle.push('claim');
				return Promise.resolve();
			}
		}
	}
}));
vi.mock('$app/env', () => ({ version: 'build-7' }));
vi.mock('$app/manifest', () => ({
	assets: [{ path: 'offline.html' }, { path: 'favicon.svg' }],
	immutable: [{ path: '_app/immutable/entry/app.abc.js' }]
}));
vi.mock('$app/paths', () => ({
	asset: (p: string) => `/${p}`,
	resolve: (p: string) => `/${p}`
}));

/** Cache Storage: every name, every put recorded. */
class FakeCaches {
	stores = new Map<string, Map<string, Response>>();
	puts: Array<{ cache: string; url: string }> = [];
	open(name: string) {
		const store = this.stores.get(name) ?? new Map<string, Response>();
		this.stores.set(name, store);
		return Promise.resolve({
			match: (req: Request | string) =>
				Promise.resolve(store.get(typeof req === 'string' ? req : new URL(req.url).pathname)),
			put: (req: Request | string, res: Response) => {
				const key = typeof req === 'string' ? req : new URL(req.url).pathname;
				this.puts.push({ cache: name, url: key });
				store.set(key, res);
				return Promise.resolve();
			},
			addAll: (urls: string[]) => {
				for (const u of urls) store.set(u, new Response(`precached ${u}`));
				return Promise.resolve();
			}
		});
	}
	match(req: string) {
		for (const store of this.stores.values()) {
			if (store.has(req)) return Promise.resolve(store.get(req));
		}
		return Promise.resolve(undefined);
	}
	keys() {
		return Promise.resolve([...this.stores.keys()]);
	}
	delete(name: string) {
		return Promise.resolve(this.stores.delete(name));
	}
}

// A glob, not an import: the worker is type-checked by its own tsconfig (webworker lib), and an
// import here would pull it into the page project's check, where `self` is not a worker scope.
const workerModule = import.meta.glob('../../../src/service-worker/index.ts');
const loadWorker = () => Object.values(workerModule)[0]!();

let cachesFake: FakeCaches;
let network: (req: Request) => Promise<Response>;

function dispatchFetch(url: string, init: { mode?: RequestMode; method?: string } = {}) {
	const request = new Request(url, { method: init.method ?? 'GET' });
	Object.defineProperty(request, 'mode', { value: init.mode ?? 'cors' });
	let responded: Promise<Response> | undefined;
	sw.handlers.fetch!({
		request,
		respondWith: (p: Promise<Response>) => void (responded = p)
	});
	return responded;
}

const install = () =>
	new Promise<void>((resolve) =>
		sw.handlers.install!({ waitUntil: (p: Promise<void>) => void p.then(resolve) })
	);

beforeEach(async () => {
	vi.resetModules();
	sw.handlers = {};
	sw.lifecycle = [];
	cachesFake = new FakeCaches();
	vi.stubGlobal('caches', cachesFake);
	network = () => Promise.resolve(new Response('', { status: 200 }));
	vi.stubGlobal('fetch', (req: Request) => network(req));
	await loadWorker();
});

const html = (body = '<html>capabilities, csrf</html>') =>
	new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });

describe('signed-in pages are never stored', () => {
	it('an HTML navigation is answered from the network and written nowhere', async () => {
		network = () => Promise.resolve(html());
		const res = await dispatchFetch('https://app.test/settings/users', { mode: 'navigate' });
		expect(await res!.text()).toContain('capabilities');
		await Promise.resolve();
		expect(cachesFake.puts).toEqual([]);
	});

	it('same for the root page and for a tenant-context page', async () => {
		network = () => Promise.resolve(html());
		for (const path of ['/', '/operator/scope/profile', '/dashboard']) {
			await dispatchFetch(`https://app.test${path}`, { mode: 'navigate' });
		}
		await Promise.resolve();
		expect(cachesFake.puts).toEqual([]);
	});

	it('__data.json is not intercepted: the browser fetches it, nothing is stored', () => {
		const responded = dispatchFetch('https://app.test/settings/users/__data.json');
		expect(responded).toBeUndefined();
		expect(cachesFake.puts).toEqual([]);
	});

	it('offline, a navigation shows the static offline page, never an old private page', async () => {
		await install();
		network = () => Promise.reject(new TypeError('offline'));
		const res = await dispatchFetch('https://app.test/settings/users', { mode: 'navigate' });
		expect(await res!.text()).toBe('precached /offline.html');
	});

	it('a page an OLD worker stored is purged on activate (the cache generation changed)', async () => {
		cachesFake.stores.set(
			'lk-runtime-build-6',
			new Map([['/settings/users', html('old private page')]])
		);
		cachesFake.stores.set('lk-api-build-6', new Map());
		await new Promise<void>((resolve) =>
			sw.handlers.activate!({ waitUntil: (p: Promise<void>) => void p.then(resolve) })
		);
		const names = await cachesFake.keys();
		expect(names).not.toContain('lk-runtime-build-6');
		expect(names).not.toContain('lk-api-build-6');
	});
});

const activate = () =>
	new Promise<void>((resolve) =>
		sw.handlers.activate!({ waitUntil: (p: Promise<void>) => void p.then(resolve) })
	);

describe('what it still caches', () => {
	it('precaches the build output and the static files (public, no session in them)', async () => {
		await install();
		const shell = [...cachesFake.stores.entries()].find(([n]) => n.startsWith('lk-shell-'));
		expect([...shell![1].keys()].sort()).toEqual(
			['/_app/immutable/entry/app.abc.js', '/favicon.svg', '/offline.html'].sort()
		);
	});

	it('keeps public images (stale-while-revalidate)', async () => {
		network = () => Promise.resolve(new Response('png', { status: 200 }));
		await dispatchFetch('https://app.test/images/logo.png');
		await Promise.resolve();
		await Promise.resolve();
		expect(cachesFake.puts.map((p) => p.url)).toEqual(['/images/logo.png']);
	});

	it('cache names carry the cache generation, so a bump purges the previous one', async () => {
		await install();
		const names = [...cachesFake.stores.keys()];
		expect(names).toContain('lk-shell-v3-build-7');
	});
});

describe('/api is not the worker business', () => {
	it.each([
		'/api/v1/crm/leads',
		'/api/v1/users',
		'/api/v1/auth/me/capabilities',
		'/api/v1/crm/leads/export',
		'/api/operator/scope'
	])('a GET to %s is not intercepted and nothing is stored', async (path) => {
		network = () =>
			Promise.resolve(
				new Response('{"a":1}', { status: 200, headers: { 'content-type': 'application/json' } })
			);
		const responded = dispatchFetch(`https://app.test${path}`);
		expect(responded).toBeUndefined();
		await Promise.resolve();
		expect(cachesFake.puts).toEqual([]);
	});

	it('never substitutes cached data when the network is slow or down (it never answers /api)', () => {
		cachesFake.stores.set('lk-api-v2-build-7', new Map([['/api/v1/users', new Response('old')]]));
		network = () => Promise.reject(new TypeError('offline'));
		expect(dispatchFetch('https://app.test/api/v1/users')).toBeUndefined();
	});

	it('a page an OLD worker kept API JSON in loses it on activate (lk-api-v2-* is purged)', async () => {
		cachesFake.stores.set('lk-api-v2-build-6', new Map([['/api/v1/users', new Response('old')]]));
		cachesFake.stores.set('lk-runtime-v2-build-6', new Map());
		await install();
		await activate();
		const names = await cachesFake.keys();
		expect(names.filter((n) => n.startsWith('lk-api-'))).toEqual([]);
		expect(names).not.toContain('lk-runtime-v2-build-6');
		expect(names).toContain('lk-shell-v3-build-7');
	});
});

describe('lifecycle: the new worker takes control at once', () => {
	it('install calls skipWaiting after the precache, so the OLD worker stops answering immediately', async () => {
		await install();
		expect(sw.lifecycle).toEqual(['skipWaiting']);
		expect([...cachesFake.stores.keys()]).toContain('lk-shell-v3-build-7');
	});

	it('activate claims the open pages', async () => {
		await install();
		await activate();
		expect(sw.lifecycle).toEqual(['skipWaiting', 'claim']);
	});

	it('the update prompt message still skips waiting', () => {
		sw.handlers.message!({ data: { type: 'SKIP_WAITING' }, waitUntil: () => {} });
		expect(sw.lifecycle).toEqual(['skipWaiting']);
	});
});
