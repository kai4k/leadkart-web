import { describe, expect, it, vi } from 'vitest';
import {
	establishSession,
	isAuthExpired,
	refreshSession,
	refreshTokens
} from '#lib/server/auth-refresh.ts';
import { mustChangePassword } from '#lib/server/cookies.ts';

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

/** Stateful fake cookie jar that records every set/delete. */
function statefulJar(initial: Record<string, string> = {}) {
	const store = new Map(Object.entries(initial));
	const sets: Array<{ name: string; value: string; opts: Record<string, unknown> }> = [];
	const deletes: string[] = [];
	return {
		store,
		sets,
		deletes,
		api: {
			get: (n: string) => store.get(n),
			set: (n: string, v: string, opts: Record<string, unknown>) => {
				store.set(n, v);
				sets.push({ name: n, value: v, opts });
			},
			delete: (n: string) => {
				store.delete(n);
				deletes.push(n);
			}
		} as never
	};
}

describe('refreshTokens status mapping and caching', () => {
	it('maps 400 and 403 to rejected', async () => {
		for (const status of [400, 403]) {
			const fetchFn = vi.fn(() => Promise.resolve(new Response('{}', { status })));
			expect(await refreshTokens(`rt-status-${status}`, fetchFn)).toEqual({
				ok: false,
				reason: 'rejected'
			});
		}
	});

	it('does not reuse an unavailable result', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(new Response('', { status: 503 })));
		await refreshTokens('rt-blip', fetchFn);
		await refreshTokens('rt-blip', fetchFn);
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	it('reuses a rejected result inside the grace window', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(new Response('{}', { status: 401 })));
		await refreshTokens('rt-rej-grace', fetchFn);
		await refreshTokens('rt-rej-grace', fetchFn);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it('fetches again once the 10 s grace window has elapsed', async () => {
		vi.useFakeTimers();
		try {
			const fetchFn = vi.fn(() => Promise.resolve(ok(pair)));
			await refreshTokens('rt-expiry', fetchFn);
			await vi.advanceTimersByTimeAsync(9_000);
			await refreshTokens('rt-expiry', fetchFn);
			expect(fetchFn).toHaveBeenCalledTimes(1);
			await vi.advanceTimersByTimeAsync(2_000);
			await refreshTokens('rt-expiry', fetchFn);
			expect(fetchFn).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('refreshSession', () => {
	it('reports none without calling Go when there is no refresh cookie', async () => {
		const j = statefulJar();
		const fetchFn = vi.fn();
		expect(await refreshSession(j.api, fetchFn)).toEqual({ ok: false, reason: 'none' });
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('rejected: clears auth cookies and the operator scope', async () => {
		const j = statefulJar({
			lk_refresh: 'rs-rejected',
			lk_csrf: 'c',
			lk_mcp: '1',
			lk_op_tenant: 'scope'
		});
		const fetchFn = vi.fn(() => Promise.resolve(new Response('{}', { status: 401 })));
		expect(await refreshSession(j.api, fetchFn)).toEqual({ ok: false, reason: 'rejected' });
		expect(j.deletes).toEqual(
			expect.arrayContaining(['lk_access', 'lk_refresh', 'lk_csrf', 'lk_mcp', 'lk_op_tenant'])
		);
		expect(j.store.size).toBe(0);
	});

	it('unavailable: leaves every cookie in place', async () => {
		const j = statefulJar({ lk_refresh: 'rs-down', lk_csrf: 'c', lk_op_tenant: 'scope' });
		const fetchFn = vi.fn(() => Promise.resolve(new Response('', { status: 503 })));
		expect(await refreshSession(j.api, fetchFn)).toEqual({ ok: false, reason: 'unavailable' });
		expect(j.deletes).toEqual([]);
		expect(j.sets).toEqual([]);
		expect([...j.store.keys()].sort()).toEqual(['lk_csrf', 'lk_op_tenant', 'lk_refresh']);
	});

	it('success: sets access + refresh, keeps the csrf value and renews its maxAge', async () => {
		const j = statefulJar({ lk_refresh: 'rs-ok', lk_csrf: 'keep-me' });
		const fetchFn = vi.fn(() =>
			Promise.resolve(ok({ access_token: 'new-a', refresh_token: 'new-r' }))
		);
		expect(await refreshSession(j.api, fetchFn)).toEqual({ ok: true, access: 'new-a' });
		expect(j.store.get('lk_access')).toBe('new-a');
		expect(j.store.get('lk_refresh')).toBe('new-r');
		expect(j.store.get('lk_csrf')).toBe('keep-me');
		const csrf = j.sets.find((s) => s.name === 'lk_csrf');
		expect(csrf?.opts.maxAge).toBe(30 * 24 * 3600);
	});
});

describe('establishSession', () => {
	it('sets the mcp cookie when must_change_password is true and clears operator scope', () => {
		const j = statefulJar({ lk_op_tenant: 'scope' });
		establishSession(j.api, { access_token: 'a', refresh_token: 'r', must_change_password: true });
		expect(j.store.get('lk_mcp')).toBe('1');
		expect(j.store.has('lk_op_tenant')).toBe(false);
		expect(j.store.get('lk_access')).toBe('a');
	});

	it('deletes the mcp cookie otherwise', () => {
		const j = statefulJar({ lk_mcp: '1' });
		establishSession(j.api, { access_token: 'a', refresh_token: 'r' });
		expect(j.store.has('lk_mcp')).toBe(false);
		expect(mustChangePassword(j.api)).toBe(false);
	});
});

describe('mustChangePassword', () => {
	it('is true only for lk_mcp=1', () => {
		expect(mustChangePassword(statefulJar({ lk_mcp: '1' }).api)).toBe(true);
		expect(mustChangePassword(statefulJar({ lk_mcp: '0' }).api)).toBe(false);
		expect(mustChangePassword(statefulJar().api)).toBe(false);
	});
});

describe('isAuthExpired', () => {
	it('is true for the authn-middleware 401 (WWW-Authenticate present)', () => {
		const resp = new Response('{"error":"unauthenticated"}', {
			status: 401,
			headers: { 'www-authenticate': 'Bearer' }
		});
		expect(isAuthExpired(resp)).toBe(true);
	});

	it('is false for a credential-failure 401 without the header', () => {
		expect(
			isAuthExpired(new Response('{"error":"incorrect_current_password"}', { status: 401 }))
		).toBe(false);
	});

	it('is false for non-401 statuses even with the header', () => {
		expect(
			isAuthExpired(new Response('{}', { status: 403, headers: { 'www-authenticate': 'x' } }))
		).toBe(false);
	});
});
