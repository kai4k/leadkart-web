/**
 * The one implementation of token refresh for the BFF.
 *
 * Single-flight: concurrent 401s for the same refresh token share one
 * call to Go. Without this, each request rotates the same token and Go's
 * reuse detection revokes the whole session. The result is kept for a
 * short grace window so a request that was already in flight with the
 * old cookie gets the same new pair instead of a second rotation.
 *
 * An `unavailable` result is never cached: a one-second Go blip must not
 * turn into ten seconds of forced failures.
 *
 * The map is per process. With several BFF instances, Go must tolerate a
 * rotated token being presented again within a few seconds.
 */
import { createHash } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { z } from 'zod';
import { config } from './config.ts';
import {
	clearAuthCookies,
	REFRESH_COOKIE,
	setAuthCookies,
	setMustChangePassword
} from './cookies.ts';
import { clearOperatorScope } from './scope.ts';

export const tokenPairSchema = z.object({
	access_token: z.string().min(1),
	refresh_token: z.string().min(1),
	must_change_password: z.boolean().optional()
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

export type RefreshResult =
	| { ok: true; tokens: TokenPair }
	| { ok: false; reason: 'rejected' | 'unavailable' };

const GRACE_MS = 10_000;
const inflight = new Map<string, Promise<RefreshResult>>();

async function callRefresh(refresh: string, fetchFn: typeof fetch): Promise<RefreshResult> {
	let resp: Response;
	try {
		resp = await fetchFn(`${config.GO_API_URL}/api/v1/auth/refresh`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify({ refresh_token: refresh }),
			signal: AbortSignal.timeout(config.UPSTREAM_TIMEOUT_MS)
		});
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
	if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
		return { ok: false, reason: 'rejected' };
	}
	if (!resp.ok) return { ok: false, reason: 'unavailable' };

	const parsed = tokenPairSchema.safeParse(await resp.json().catch(() => null));
	return parsed.success ? { ok: true, tokens: parsed.data } : { ok: false, reason: 'unavailable' };
}

export function refreshTokens(
	refresh: string,
	fetchFn: typeof fetch = fetch
): Promise<RefreshResult> {
	const key = createHash('sha256').update(refresh).digest('hex');
	const existing = inflight.get(key);
	if (existing) return existing;

	const pending = callRefresh(refresh, fetchFn);
	inflight.set(key, pending);
	const cleanup = (result?: RefreshResult): void => {
		if (!result || (!result.ok && result.reason === 'unavailable')) {
			inflight.delete(key);
			return;
		}
		const timer = setTimeout(() => inflight.delete(key), GRACE_MS);
		timer.unref?.();
	};
	pending.then(cleanup, () => cleanup());
	return pending;
}

/** Start a session from a login response. The one place login cookies are written. */
export function establishSession(cookies: Cookies, tokens: TokenPair): void {
	clearOperatorScope(cookies);
	setAuthCookies(cookies, tokens.access_token, tokens.refresh_token);
	setMustChangePassword(cookies, tokens.must_change_password === true);
}

/**
 * Refresh using the request's cookies. Returns the new access token, or
 * null. A rejected refresh token ends the session (all auth cookies and
 * the operator scope are cleared); an unreachable Go API leaves the
 * cookies alone so the next request can try again.
 */
export async function refreshSession(
	cookies: Cookies,
	fetchFn: typeof fetch = fetch
): Promise<string | null> {
	const refresh = cookies.get(REFRESH_COOKIE);
	if (!refresh) return null;

	const result = await refreshTokens(refresh, fetchFn);
	if (result.ok) {
		setAuthCookies(cookies, result.tokens.access_token, result.tokens.refresh_token, {
			keepCsrf: true
		});
		return result.tokens.access_token;
	}
	if (result.reason === 'rejected') {
		clearAuthCookies(cookies);
		clearOperatorScope(cookies);
	}
	return null;
}
