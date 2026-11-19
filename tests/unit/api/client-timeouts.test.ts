import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { api, buildQueryString, DEFAULT_TIMEOUT_MS } from '#lib/api/client.ts';
import { SchemaError, TimeoutError } from '#lib/api/errors.ts';
import { anySignal, requestSignal } from '#lib/api/abort.ts';
import { BFF_MAX_UPSTREAM_HOPS, DEFAULT_UPSTREAM_TIMEOUT_MS } from '#lib/api/timeouts.ts';
import { configSchema } from '#lib/server/config.ts';

/** A fetch that never answers, but rejects with the signal's reason when aborted (like the real one). */
function hangingFetch() {
	return vi.fn((_url: string, init?: RequestInit) => {
		return new Promise<Response>((_resolve, reject) => {
			const signal = init?.signal;
			if (signal?.aborted) return reject(signal.reason);
			signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
		});
	});
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('timeout budget', () => {
	it('client read timeout exceeds 3x the BFF upstream timeout (the config default)', () => {
		const out = configSchema.safeParse({
			GO_API_URL: 'http://localhost:8080',
			SCOPE_COOKIE_SECRET: 'x'.repeat(32),
			NODE_ENV: 'test'
		});
		const upstream = out.success ? out.data.UPSTREAM_TIMEOUT_MS : NaN;
		expect(upstream).toBe(DEFAULT_UPSTREAM_TIMEOUT_MS);
		expect(DEFAULT_TIMEOUT_MS).toBeGreaterThan(BFF_MAX_UPSTREAM_HOPS * upstream);
	});
});

describe('client timeouts', () => {
	it('reads time out only after the read budget', async () => {
		vi.stubGlobal('fetch', hangingFetch());
		const settled = vi.fn();
		const p = api.get('/v1/x', z.unknown()).catch((e: unknown) => {
			settled(e);
			return e;
		});
		await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS - 1);
		expect(settled).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(await p).toBeInstanceOf(TimeoutError);
	});

	it('mutations have no default client timeout', async () => {
		vi.stubGlobal('fetch', hangingFetch());
		const settled = vi.fn();
		void api.post('/v1/x', {}).catch(settled);
		await vi.advanceTimersByTimeAsync(10 * 60_000);
		expect(settled).not.toHaveBeenCalled();
	});

	it('a caller timeoutMs applies to mutations', async () => {
		vi.stubGlobal('fetch', hangingFetch());
		const p = api.post('/v1/x', {}, { timeoutMs: 500 }).catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(500);
		expect(await p).toBeInstanceOf(TimeoutError);
	});

	it.each([0, Infinity])('timeoutMs %s means no timeout', async (timeoutMs) => {
		vi.stubGlobal('fetch', hangingFetch());
		const settled = vi.fn();
		void api.get('/v1/x', z.unknown(), { timeoutMs }).catch(settled);
		await vi.advanceTimersByTimeAsync(10 * 60_000);
		expect(settled).not.toHaveBeenCalled();
	});

	it('forwards the caller signal to fetch and rethrows its reason', async () => {
		vi.stubGlobal('fetch', hangingFetch());
		const ctrl = new AbortController();
		const p = api.get('/v1/x', z.unknown(), { signal: ctrl.signal }).catch((e: unknown) => e);
		ctrl.abort(new DOMException('cancelled', 'AbortError'));
		expect(await p).toMatchObject({ name: 'AbortError' });
	});

	it('uses the fallback combiner when AbortSignal.any is missing', async () => {
		vi.stubGlobal('fetch', hangingFetch());
		const original = AbortSignal.any;
		// @ts-expect-error simulate Safari < 17.4
		AbortSignal.any = undefined;
		try {
			const ctrl = new AbortController();
			const p = api.get('/v1/x', z.unknown(), { signal: ctrl.signal }).catch((e: unknown) => e);
			ctrl.abort(new DOMException('cancelled', 'AbortError'));
			expect(await p).toMatchObject({ name: 'AbortError' });
			const p2 = api
				.get('/v1/y', z.unknown(), { signal: new AbortController().signal })
				.catch((e: unknown) => e);
			await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS);
			expect(await p2).toBeInstanceOf(TimeoutError);
		} finally {
			AbortSignal.any = original;
		}
	});
});

describe('anySignal / requestSignal', () => {
	it('fallback aborts with the first reason and pre-aborted inputs', () => {
		const original = AbortSignal.any;
		// @ts-expect-error simulate old engine
		AbortSignal.any = undefined;
		try {
			const a = new AbortController();
			const b = new AbortController();
			const s = anySignal([a.signal, b.signal]).signal;
			expect(s.aborted).toBe(false);
			b.abort('why');
			expect(s.aborted).toBe(true);
			expect(s.reason).toBe('why');
			const pre = new AbortController();
			pre.abort('early');
			expect(anySignal([pre.signal, a.signal]).signal.reason).toBe('early');
		} finally {
			AbortSignal.any = original;
		}
	});

	it('requestSignal without a timeout passes the caller signal through', () => {
		const c = new AbortController();
		expect(requestSignal(c.signal, undefined).signal).toBe(c.signal);
		expect(requestSignal(undefined, 0).signal).toBeUndefined();
	});
});

describe('timer and listener hygiene', () => {
	const ok = () => new Response('{}', { headers: { 'content-type': 'application/json' } });

	it('leaves no timer behind after success or after an error', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()));
		await api.get('/v1/x', z.unknown());
		expect(vi.getTimerCount()).toBe(0);
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
		await api.get('/v1/x', z.unknown()).catch(() => {});
		expect(vi.getTimerCount()).toBe(0);
	});

	it('the fallback combiner removes its listener from the caller signal after success', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()));
		const original = AbortSignal.any;
		// @ts-expect-error simulate Safari < 17.4
		AbortSignal.any = undefined;
		try {
			const caller = new AbortController();
			const add = vi.spyOn(caller.signal, 'addEventListener');
			const remove = vi.spyOn(caller.signal, 'removeEventListener');
			await api.get('/v1/x', z.unknown(), { signal: caller.signal });
			expect(add).toHaveBeenCalledTimes(1);
			expect(remove).toHaveBeenCalledTimes(1);
			expect(remove.mock.calls[0][1]).toBe(add.mock.calls[0][1]);
		} finally {
			AbortSignal.any = original;
		}
	});

	it('a stall while reading the body times out, whatever the rejection reason is', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn((_url: string, init?: RequestInit) =>
				Promise.resolve({
					ok: true,
					status: 200,
					headers: new Headers(),
					text: () =>
						new Promise<string>((_resolve, reject) =>
							init?.signal?.addEventListener('abort', () => reject(new Error('stream reset')), {
								once: true
							})
						)
				} as unknown as Response)
			)
		);
		const p = api.get('/v1/x', z.unknown()).catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS);
		expect(await p).toBeInstanceOf(TimeoutError);
	});
});

describe('JSON body contract', () => {
	const text = (status: number, body: string, type = 'text/plain') =>
		new Response(body, { status, headers: { 'content-type': type } });

	it('an empty 204 on a JSON call is a SchemaError that says so', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
		const err = (await api
			.postJson('/v1/x', {}, z.object({ id: z.string() }))
			.catch((e: unknown) => e)) as SchemaError;
		expect(err).toBeInstanceOf(SchemaError);
		expect(err.message).toContain('expected a JSON body, got 204 with an empty/non-JSON body');
	});

	it('a non-JSON 200 on a JSON call is a SchemaError', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(text(200, '<html>oops</html>', 'text/html')));
		const err = (await api
			.get('/v1/x', z.object({ n: z.number() }))
			.catch((e: unknown) => e)) as SchemaError;
		expect(err).toBeInstanceOf(SchemaError);
		expect(err.message).toContain('got 200');
	});

	it('a void call tolerates any 2xx body', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(text(200, 'ok')));
		await expect(api.post('/v1/x')).resolves.toBeUndefined();
	});

	it('non-JSON error bodies still map by status (Go mux text/plain 404, HTML 502)', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(text(404, '404 page not found\n')));
		await expect(api.get('/v1/x', z.unknown())).rejects.toMatchObject({
			name: 'NotFoundError',
			status: 404
		});
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(text(502, '<html>bad gateway</html>', 'text/html'))
		);
		await expect(api.get('/v1/x', z.unknown())).rejects.toMatchObject({
			name: 'ServerError',
			status: 502
		});
	});
});

describe('buildQueryString', () => {
	it('rejects non-finite numbers with a developer error', () => {
		expect(() => buildQueryString({ n: NaN })).toThrow(/non-finite/);
		expect(() => buildQueryString({ n: Infinity })).toThrow(/non-finite/);
		expect(() => buildQueryString({ n: [1, NaN] })).toThrow(/non-finite/);
	});
	it('serialises arrays as repeated keys', () => {
		expect(buildQueryString({ s: ['a', 'b'], n: 0 })).toBe('?s=a&s=b&n=0');
	});
});
