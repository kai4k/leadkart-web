import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { config } from '#lib/server/config.ts';
import {
	flattenGoErrors,
	goAuthFetch,
	goErrorStatus,
	goFetch,
	readGoError
} from '#lib/server/go.ts';
import { AUTH_BODY_LIMIT_BYTES, isUpstreamTimeout, upstreamStatus } from '#lib/server/proxy.ts';

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

describe('goFetch without an access cookie', () => {
	it('no refresh cookie either: the session is over, so sign in', async () => {
		const fetchFn = vi.fn();
		vi.stubGlobal('fetch', fetchFn);
		await expect(goFetch(jar({}), '/v1/users')).rejects.toMatchObject({
			status: 303,
			location: '/signin'
		});
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('refresh cookie still present (the hook could not reach Go): 503, not a sign-out', async () => {
		const fetchFn = vi.fn();
		vi.stubGlobal('fetch', fetchFn);
		await expect(goFetch(jar({ lk_refresh: 'rt' }), '/v1/users')).rejects.toMatchObject({
			status: 503
		});
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('requireAuth:false callers still get to decide for themselves', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(new Response('{}', { status: 401 })));
		vi.stubGlobal('fetch', fetchFn);
		const resp = await goFetch(jar({ lk_refresh: 'rt' }), '/v1/users', { requireAuth: false });
		expect(resp.status).toBe(401);
	});
});

describe('goErrorStatus', () => {
	it('keeps 4xx/5xx statuses', () => {
		expect(goErrorStatus(new Response(null, { status: 404 }))).toBe(404);
		expect(goErrorStatus(new Response(null, { status: 503 }))).toBe(503);
	});

	it('maps an unfollowed 3xx (not a status error()/fail() accept) to 502', () => {
		for (const status of [301, 302, 303, 307, 308]) {
			expect(goErrorStatus(new Response(null, { status }))).toBe(502);
		}
	});
});

describe('goAuthFetch', () => {
	it('POSTs JSON to the Go API, never follows redirects, carries no auth or scope', async () => {
		const fetchFn = vi.fn((_url: string, _init: RequestInit) =>
			Promise.resolve(new Response(null, { status: 204 }))
		);
		vi.stubGlobal('fetch', fetchFn);

		const resp = await goAuthFetch('/v1/auth/login', { body: { email: 'a@b.test' } });

		expect(resp.status).toBe(204);
		const [url, init] = fetchFn.mock.calls[0];
		expect(url).toMatch(/\/api\/v1\/auth\/login$/);
		expect(init.method).toBe('POST');
		expect(init.redirect).toBe('manual');
		expect(init.body).toBe('{"email":"a@b.test"}');
		expect(init.signal).toBeInstanceOf(AbortSignal);
		const sent = Object.fromEntries(
			Object.entries(init.headers as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v])
		);
		expect(sent['content-type']).toBe('application/json');
		expect(sent['authorization']).toBeUndefined();
		expect(sent['x-tenant-id']).toBeUndefined();
	});

	it('rejects on transport failure so the caller can answer 502/504', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new TypeError('fetch failed')))
		);
		await expect(goAuthFetch('/v1/auth/login', { body: {} })).rejects.toThrow('fetch failed');
	});

	it('aborts with a TimeoutError when Go sends no headers in time', async () => {
		vi.useFakeTimers();
		try {
			vi.stubGlobal(
				'fetch',
				vi.fn(
					(_url: string, init: RequestInit) =>
						new Promise((_resolve, reject) => {
							init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
						})
				)
			);
			const pending = goAuthFetch('/v1/auth/login', { body: {} });
			const caught = pending.catch((e: unknown) => e);
			await vi.advanceTimersByTimeAsync(config.UPSTREAM_TIMEOUT_MS + 1);
			expect(isUpstreamTimeout(await caught)).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('goAuthFetch is the one pre-login / refresh call', () => {
	it('is the same function whether imported from go.ts or the cycle-free module', async () => {
		const proxy = await import('#lib/server/proxy.ts');
		expect(proxy.goAuthFetch).toBe(goAuthFetch);
	});

	it('uses the injected fetch (refresh tests) with the same hardening', async () => {
		const fetchFn = vi.fn((_url: string, _init: RequestInit) =>
			Promise.resolve(new Response(null, { status: 204 }))
		);
		await goAuthFetch('/v1/auth/refresh', { body: { refresh_token: 'r' } }, fetchFn as never);
		const [url, init] = fetchFn.mock.calls[0];
		expect(url).toMatch(/\/api\/v1\/auth\/refresh$/);
		expect(init.redirect).toBe('manual');
		expect(init.signal).toBeInstanceOf(AbortSignal);
		expect(init.body).toBe('{"refresh_token":"r"}');
	});
});

describe('readGoError / flattenGoErrors', () => {
	it('reads Go’s envelope (error code, message, errors map)', async () => {
		const resp = new Response(
			JSON.stringify({
				error: 'invalid_password',
				message: 'x',
				errors: { new_password: ['too short'] }
			}),
			{ status: 400 }
		);
		const body = await readGoError(resp);
		expect(body.error).toBe('invalid_password');
		expect(flattenGoErrors(body)).toEqual({ new_password: 'too short' });
	});

	it('returns {} for an empty or unparseable body', async () => {
		expect(await readGoError(new Response('', { status: 500 }))).toEqual({});
		expect(await readGoError(new Response('<html>', { status: 502 }))).toEqual({});
	});
});

describe('goAuthFetch bounds the body read by the same deadline', () => {
	it('rejects with a timeout when the body stalls after headers arrived', async () => {
		vi.useFakeTimers();
		try {
			const fetchFn = vi.fn((_url: string, init: RequestInit) => {
				const body = new ReadableStream<Uint8Array>({
					start(controller) {
						init.signal?.addEventListener('abort', () => controller.error(init.signal?.reason));
					}
				});
				return Promise.resolve(new Response(body, { status: 200 }));
			});
			const caught = goAuthFetch(
				'/v1/auth/refresh',
				{ body: { refresh_token: 'r' } },
				fetchFn as never
			).catch((e: unknown) => e);
			await vi.advanceTimersByTimeAsync(config.UPSTREAM_TIMEOUT_MS + 1);
			expect(isUpstreamTimeout(await caught)).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});

	it('returns a Response with the same status, headers and body text', async () => {
		const fetchFn = vi.fn(() =>
			Promise.resolve(
				new Response('{"a":1}', {
					status: 401,
					headers: { 'content-type': 'application/json', 'www-authenticate': 'Bearer' }
				})
			)
		);
		const resp = await goAuthFetch('/v1/auth/login', { body: {} }, fetchFn as never);
		expect(resp.status).toBe(401);
		expect(resp.headers.get('www-authenticate')).toBe('Bearer');
		expect(await resp.json()).toEqual({ a: 1 });
	});

	it('keeps a 3xx (redirect: manual) as it came, without a body', async () => {
		const fetchFn = vi.fn(() =>
			Promise.resolve(new Response(null, { status: 302, headers: { location: '/x' } }))
		);
		const resp = await goAuthFetch('/v1/auth/login', { body: {} }, fetchFn as never);
		expect(resp.status).toBe(302);
		expect(resp.headers.get('location')).toBe('/x');
	});
});

describe('goAuthFetch caps the body it buffers', () => {
	it('fails as an upstream error (502) and cancels the stream once the cap is exceeded', async () => {
		let cancelled = false;
		const chunk = new Uint8Array(16 * 1024);
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				controller.enqueue(chunk); // endless stream
			},
			cancel() {
				cancelled = true;
			}
		});
		const fetchFn = vi.fn(() => Promise.resolve(new Response(body, { status: 200 })));
		const caught = await goAuthFetch('/v1/auth/login', { body: {} }, fetchFn as never).catch(
			(e: unknown) => e
		);
		expect(caught).toBeInstanceOf(Error);
		expect(upstreamStatus(caught)).toBe(502);
		expect(cancelled).toBe(true);
	});

	it('is 64 KiB and passes a body exactly at the cap', async () => {
		expect(AUTH_BODY_LIMIT_BYTES).toBe(64 * 1024);
		const text = 'a'.repeat(AUTH_BODY_LIMIT_BYTES);
		const fetchFn = vi.fn(() => Promise.resolve(new Response(text, { status: 200 })));
		const resp = await goAuthFetch('/v1/auth/login', { body: {} }, fetchFn as never);
		expect((await resp.text()).length).toBe(AUTH_BODY_LIMIT_BYTES);
	});

	it('drops content-encoding and content-length: they no longer describe the re-wrapped body', async () => {
		const fetchFn = vi.fn(() =>
			Promise.resolve(
				new Response('{"a":1}', {
					status: 200,
					headers: { 'content-encoding': 'gzip', 'content-length': '999', 'x-keep': '1' }
				})
			)
		);
		const resp = await goAuthFetch('/v1/auth/login', { body: {} }, fetchFn as never);
		expect(resp.headers.get('content-encoding')).toBeNull();
		expect(resp.headers.get('content-length')).toBeNull();
		expect(resp.headers.get('x-keep')).toBe('1');
	});
});
