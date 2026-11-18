import { describe, expect, it, vi } from 'vitest';
import { refreshTokens } from '#lib/server/auth-refresh.ts';

const ok = (body: unknown) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
const pair = { access_token: 'a1', refresh_token: 'r1' };

describe('refreshTokens', () => {
	it('returns the parsed pair on 200', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(ok(pair)));
		expect(await refreshTokens('rt-ok', fetchFn)).toEqual({ ok: true, tokens: pair });
	});

	it('single-flights concurrent calls for the same token', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(ok(pair)));
		const [a, b, c] = await Promise.all([
			refreshTokens('rt-same', fetchFn),
			refreshTokens('rt-same', fetchFn),
			refreshTokens('rt-same', fetchFn)
		]);
		expect(fetchFn).toHaveBeenCalledTimes(1);
		expect(a).toEqual(b);
		expect(b).toEqual(c);
	});

	it('reuses the result for a late request inside the grace window', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(ok(pair)));
		await refreshTokens('rt-grace', fetchFn);
		await refreshTokens('rt-grace', fetchFn);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it('reports rejected on 401', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(new Response('{}', { status: 401 })));
		expect(await refreshTokens('rt-401', fetchFn)).toEqual({ ok: false, reason: 'rejected' });
	});

	it('reports unavailable on network failure', async () => {
		const fetchFn = vi.fn(() => Promise.reject(new TypeError('fetch failed')));
		expect(await refreshTokens('rt-net', fetchFn)).toEqual({ ok: false, reason: 'unavailable' });
	});

	it('reports unavailable on 5xx and on a malformed 200 body', async () => {
		expect(
			await refreshTokens(
				'rt-500',
				vi.fn(() => Promise.resolve(new Response('', { status: 503 })))
			)
		).toEqual({
			ok: false,
			reason: 'unavailable'
		});
		expect(
			await refreshTokens(
				'rt-bad',
				vi.fn(() => Promise.resolve(ok({ access_token: '' })))
			)
		).toEqual({
			ok: false,
			reason: 'unavailable'
		});
	});
});
