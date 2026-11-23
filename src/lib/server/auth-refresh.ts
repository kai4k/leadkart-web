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
import { error, type Cookies } from '@sveltejs/kit';
import { z } from 'zod';
import type { SigninNotice } from '../api/signin-notice.ts';
import {
	clearAuthCookies,
	clearSigninNotice,
	mustChangePassword,
	REFRESH_COOKIE,
	setAuthCookies,
	setMustChangePassword,
	setSigninNotice
} from './cookies.ts';
import { goAuthFetch } from './proxy.ts';
import { clearOperatorScope } from './scope.ts';

export const tokenPairSchema = z.object({
	access_token: z.string().min(1),
	refresh_token: z.string().min(1),
	must_change_password: z.boolean().optional()
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

/**
 * The three ends of a session Go names on a rejected refresh (`reason` of 401 `refresh_rejected`:
 * leadkart-go internal/identity/ports/errcodes.go RefreshReason*, http.go handleRefresh). Every other
 * refusal (unknown, revoked, reused token, deleted company) carries none and must stay
 * indistinguishable, so anything that is not exactly one of these reads as `session_expired`.
 */
const REFRESH_REJECTIONS = ['session_expired', 'tenant_suspended', 'tenant_not_active'] as const;
export type RefreshRejection = (typeof REFRESH_REJECTIONS)[number];

export type RefreshResult =
	| { ok: true; tokens: TokenPair }
	| { ok: false; reason: 'rejected'; why: RefreshRejection }
	| { ok: false; reason: 'unavailable' };

const GRACE_MS = 10_000;
const inflight = new Map<string, Promise<RefreshResult>>();

/** Which of the three names the rejection carries. Only a name from the list leaves here, never Go's text. */
async function rejectionOf(resp: Response): Promise<RefreshRejection> {
	const body: unknown = await resp.json().catch(() => null);
	const reason =
		typeof body === 'object' && body !== null ? (body as { reason?: unknown }).reason : undefined;
	return REFRESH_REJECTIONS.find((name) => name === reason) ?? 'session_expired';
}

async function callRefresh(refresh: string, fetchFn: typeof fetch): Promise<RefreshResult> {
	let resp: Response;
	try {
		resp = await goAuthFetch('/v1/auth/refresh', { body: { refresh_token: refresh } }, fetchFn);
	} catch {
		return { ok: false, reason: 'unavailable' };
	}
	if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
		return { ok: false, reason: 'rejected', why: await rejectionOf(resp) };
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
	clearSigninNotice(cookies);
}

/**
 * End a session that is OVER (Go refused the refresh token, or the person changed their password
 * and Go revoked every session): what sign-out clears, plus the one-word notice the sign-in page
 * shows once. The one place a session ends with a reason; a sign-out the person asked for sets none.
 */
export function endSession(cookies: Cookies, notice: SigninNotice): void {
	clearAuthCookies(cookies);
	clearOperatorScope(cookies);
	setSigninNotice(cookies, notice);
}

/**
 * Go answers 401 for two different things: its authn middleware (expired or
 * invalid token — carries `WWW-Authenticate`, body `unauthenticated`) and
 * credential failures such as a wrong current password (no header). Only
 * the first means "refresh and retry"; refreshing on the second would
 * rotate the token family and replay the request for nothing. One rule,
 * used by goFetch and the /api proxy.
 */
export function isAuthExpired(resp: Response): boolean {
	return resp.status === 401 && resp.headers.has('www-authenticate');
}

export type SessionRefresh =
	| { ok: true; access: string }
	/** `none`: no refresh cookie · `rejected`: Go refused it (session ended) · `unavailable`: Go unreachable or failing. */
	| { ok: false; reason: 'none' | 'rejected' | 'unavailable' };

/**
 * Refresh using the request's cookies. A rejected refresh token ends the
 * session (all auth cookies and the operator scope are cleared, and the
 * sign-in notice says which of Go's three reasons it was); an
 * unreachable Go API leaves the cookies alone so the next request can try
 * again. Callers use `reason` to tell "sign the user out" from "try again";
 * why Go refused reaches the browser only as the notice cookie.
 */
export async function refreshSession(
	cookies: Cookies,
	fetchFn: typeof fetch = fetch
): Promise<SessionRefresh> {
	const refresh = cookies.get(REFRESH_COOKIE);
	if (!refresh) return { ok: false, reason: 'none' };

	const result = await refreshTokens(refresh, fetchFn);
	if (result.ok) {
		setAuthCookies(cookies, result.tokens.access_token, result.tokens.refresh_token, {
			keepCsrf: true
		});
		// Go's refresh body says whether the password must change, like the login body: follow it, so
		// the gate appears when an admin reset the password meanwhile and lifts when it no longer
		// applies. A body without the field keeps what the session had. Setting it also renews the
		// cookie: the refresh cookie rolls for 14 days on every refresh, and a gate set once at login
		// would lapse 14 days later. Nothing is written for a session that has no gate and needs none.
		const had = mustChangePassword(cookies);
		const flagged = result.tokens.must_change_password ?? had;
		if (flagged || had) setMustChangePassword(cookies, flagged);
		return { ok: true, access: result.tokens.access_token };
	}
	if (result.reason === 'rejected') endSession(cookies, result.why);
	return { ok: false, reason: result.reason };
}

/**
 * For loads that found no access cookie: if the hook's refresh could not reach
 * Go, the session is not known to be over, so answer 503 (cookies kept, a
 * reload retries) instead of sending the user to /signin.
 */
export function assertRefreshReachable(locals: Pick<App.Locals, 'refreshOutcome'>): void {
	if (locals.refreshOutcome === 'unavailable') error(503, 'Service temporarily unavailable');
}
