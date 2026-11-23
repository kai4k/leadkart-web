import { describe, expect, it, vi } from 'vitest';
import {
	assertRefreshReachable,
	endSession,
	establishSession,
	isAuthExpired,
	refreshSession,
	refreshTokens
} from '#lib/server/auth-refresh.ts';
import { clearAuthCookies, mustChangePassword } from '#lib/server/cookies.ts';

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

	it('reports rejected on 401 (no reason from Go: the one "session ended" answer)', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(new Response('{}', { status: 401 })));
		expect(await refreshTokens('rt-401', fetchFn)).toEqual({
			ok: false,
			reason: 'rejected',
			why: 'session_expired'
		});
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
				reason: 'rejected',
				why: 'session_expired'
			});
		}
	});

	/**
	 * Go: identity/ports/http.go handleRefresh, 401 `refresh_rejected` with `reason` for exactly three
	 * arms (errcodes.go RefreshReason*); every other refusal has none (BFF_API_CHANGES rows 28, 37-39).
	 */
	const rejection = (reason?: unknown, status = 401) =>
		new Response(
			JSON.stringify({
				type: 'https://leadkart.io/problems/refresh_rejected',
				title: 'Unauthorized',
				status,
				error: 'refresh_rejected',
				...(reason === undefined ? {} : { reason })
			}),
			{ status, headers: { 'content-type': 'application/problem+json' } }
		);

	it.each([
		['session_expired', 'session_expired'],
		['tenant_suspended', 'tenant_suspended'],
		['tenant_not_active', 'tenant_not_active'],
		// everything Go does not name, and everything that is not one of its three names
		[undefined, 'session_expired'],
		['', 'session_expired'],
		['idle_timeout', 'session_expired'],
		['password_changed', 'session_expired'],
		['TENANT_SUSPENDED', 'session_expired'],
		['tenant_suspended; Path=/', 'session_expired'],
		['<script>alert(1)</script>', 'session_expired'],
		[{ code: 'tenant_suspended' }, 'session_expired'],
		[['tenant_suspended'], 'session_expired'],
		[42, 'session_expired'],
		[null, 'session_expired']
	])('a rejected refresh with reason %j says %s', async (reason, why) => {
		const fetchFn = vi.fn(() => Promise.resolve(rejection(reason)));
		const key = `rt-reason-${JSON.stringify(reason)}`;
		expect(await refreshTokens(key, fetchFn)).toEqual({ ok: false, reason: 'rejected', why });
	});

	it('an unreadable rejection body is still a rejection, with the one plain answer', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(new Response('<html>nope', { status: 401 })));
		expect(await refreshTokens('rt-html', fetchFn)).toEqual({
			ok: false,
			reason: 'rejected',
			why: 'session_expired'
		});
	});

	it('an outage carries no reason, whatever its body says', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(rejection('tenant_suspended', 503)));
		expect(await refreshTokens('rt-503-reason', fetchFn)).toEqual({
			ok: false,
			reason: 'unavailable'
		});
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
		// nothing of the session is left: the one cookie that remains is the notice for the sign-in page
		expect([...j.store.keys()]).toEqual(['lk_signin_notice']);
	});

	it.each([
		['session_expired', 'session_expired'],
		['tenant_suspended', 'tenant_suspended'],
		['tenant_not_active', 'tenant_not_active'],
		[undefined, 'session_expired'],
		['reuse_detected', 'session_expired'],
		['eyJhbGciOiJIUzI1NiJ9.e30.sig', 'session_expired']
	])(
		'rejected with reason %j: cookies cleared, the notice is %s and nothing else',
		async (reason, notice) => {
			const j = statefulJar({
				lk_refresh: `rs-why-${reason}`,
				lk_csrf: 'c',
				lk_op_tenant: 'scope'
			});
			const body = JSON.stringify({ error: 'refresh_rejected', ...(reason ? { reason } : {}) });
			const fetchFn = vi.fn(() => Promise.resolve(new Response(body, { status: 401 })));
			// what the hook and the proxy read is unchanged: no reason, no text
			expect(await refreshSession(j.api, fetchFn)).toEqual({ ok: false, reason: 'rejected' });
			expect(j.sets).toEqual([
				{
					name: 'lk_signin_notice',
					value: notice,
					opts: { path: '/signin', maxAge: 120, sameSite: 'lax', secure: false, httpOnly: false }
				}
			]);
			expect([...j.store.entries()]).toEqual([['lk_signin_notice', notice]]);
		}
	);

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
		expect(csrf?.opts.maxAge).toBe(14 * 24 * 3600);
	});
});

describe('refreshSession and the forced-change cookie', () => {
	const renew = () =>
		vi.fn(() => Promise.resolve(ok({ access_token: 'new-a', refresh_token: 'new-r' })));

	it('re-sets lk_mcp with the fresh 14-day lifetime so the gate does not lapse', async () => {
		const j = statefulJar({ lk_refresh: 'rs-mcp', lk_csrf: 'c', lk_mcp: '1' });
		await refreshSession(j.api, renew());
		const mcp = j.sets.find((s) => s.name === 'lk_mcp');
		expect(mcp?.value).toBe('1');
		expect(mcp?.opts.maxAge).toBe(14 * 24 * 3600);
		expect(mcp?.opts.httpOnly).toBe(true);
	});

	it('does not invent the cookie for a session that has none', async () => {
		const j = statefulJar({ lk_refresh: 'rs-nomcp', lk_csrf: 'c' });
		await refreshSession(j.api, renew());
		expect(j.sets.find((s) => s.name === 'lk_mcp')).toBeUndefined();
		expect(j.store.has('lk_mcp')).toBe(false);
		expect(j.deletes).not.toContain('lk_mcp');
	});

	// Go: the refresh body always has `must_change_password` (BFF_API_CHANGES row 28); it is honoured
	// the way sign-in honours it, so the gate follows the account, not the day the person signed in.
	const renewWith = (flag: boolean) =>
		vi.fn(() =>
			Promise.resolve(
				ok({ access_token: 'new-a', refresh_token: 'new-r', must_change_password: flag })
			)
		);

	it('sets the gate when the refresh says the password must change (an admin reset it meanwhile)', async () => {
		const j = statefulJar({ lk_refresh: 'rs-mcp-on', lk_csrf: 'c' });
		await refreshSession(j.api, renewWith(true));
		expect(mustChangePassword(j.api)).toBe(true);
		expect(j.sets.find((s) => s.name === 'lk_mcp')?.opts).toMatchObject({
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 14 * 24 * 3600
		});
	});

	it('lifts the gate when the refresh says the password no longer has to change', async () => {
		const j = statefulJar({ lk_refresh: 'rs-mcp-off', lk_csrf: 'c', lk_mcp: '1' });
		await refreshSession(j.api, renewWith(false));
		expect(mustChangePassword(j.api)).toBe(false);
		expect(j.deletes).toContain('lk_mcp');
	});

	it('writes nothing about the gate when the refresh says false and there is none', async () => {
		const j = statefulJar({ lk_refresh: 'rs-mcp-none', lk_csrf: 'c' });
		await refreshSession(j.api, renewWith(false));
		expect(j.sets.find((s) => s.name === 'lk_mcp')).toBeUndefined();
		expect(j.deletes).not.toContain('lk_mcp');
	});
});

describe('endSession: the one way a session that is over is ended in the browser', () => {
	it('clears what sign-out clears (session cookies, operator scope) and sets the notice', () => {
		const signedOut = statefulJar({ lk_access: 'a', lk_refresh: 'r', lk_csrf: 'c', lk_mcp: '1' });
		clearAuthCookies(signedOut.api);
		const j = statefulJar({
			lk_access: 'a',
			lk_refresh: 'r',
			lk_csrf: 'c',
			lk_mcp: '1',
			lk_op_tenant: 'scope'
		});
		endSession(j.api, 'password_changed');
		expect(j.deletes).toEqual([...signedOut.deletes, 'lk_op_tenant']);
		expect([...j.store.entries()]).toEqual([['lk_signin_notice', 'password_changed']]);
	});

	it('a value outside the allow-list still ends the session and sets no notice', () => {
		const j = statefulJar({ lk_access: 'a', lk_refresh: 'r', lk_csrf: 'c' });
		endSession(j.api, 'made_up' as never);
		expect(j.store.size).toBe(0);
		expect(j.sets).toEqual([]);
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

	it('a successful sign-in clears any stale sign-in notice', () => {
		const j = statefulJar({ lk_signin_notice: 'session_expired' });
		establishSession(j.api, { access_token: 'a', refresh_token: 'r' });
		expect(j.store.has('lk_signin_notice')).toBe(false);
		expect(j.deletes).toContain('lk_signin_notice');
		expect(j.sets.map((s) => s.name)).not.toContain('lk_signin_notice');
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

describe('assertRefreshReachable', () => {
	it('answers 503 when the hook could not reach Go to refresh', () => {
		expect(() => assertRefreshReachable({ refreshOutcome: 'unavailable' })).toThrow(
			expect.objectContaining({ status: 503 })
		);
	});

	it('lets every other outcome through (the caller redirects to /signin)', () => {
		for (const refreshOutcome of [undefined, 'none', 'rejected', 'renewed'] as const) {
			expect(() => assertRefreshReachable({ refreshOutcome })).not.toThrow();
		}
	});
});
