/**
 * Server-only cookie helpers for BFF auth.
 *
 * Cookie names:
 *   Production:  __Host-lk_access  +  lk_refresh  +  lk_csrf
 *   Dev / test:        lk_access  +  lk_refresh  +  lk_csrf
 *
 * The __Host- prefix is a browser-enforced hardening (requires Secure,
 * Path=/, no Domain). Chrome silently rejects __Host-* cookies served
 * over HTTP — so on localhost dev/test where TLS isn't terminated we
 * drop the prefix to keep the cookie usable. Production runs behind a
 * TLS terminator and the prefix reattaches.
 *
 * lk_refresh is Path=/ (httpOnly, SameSite=Strict): the proxy, the (app)
 * layout and /auth/logout all need to receive it. It used to be scoped to
 * /auth/refresh, a path with no route, so the browser never sent it.
 *
 * lk_signin_notice is not a session cookie: a short-lived name telling the sign-in page why the
 * session ended (see `setSigninNotice`).
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { Cookies } from '@sveltejs/kit';
import {
	SIGNIN_NOTICE_COOKIE,
	SIGNIN_NOTICE_PATH,
	signinNoticeOf,
	type SigninNotice
} from '../api/signin-notice.ts';
import { isProd } from './config';

export const ACCESS_COOKIE = (): string => (isProd() ? '__Host-lk_access' : 'lk_access');
export const REFRESH_COOKIE = 'lk_refresh';
export const CSRF_COOKIE = 'lk_csrf';
const MCP_COOKIE = 'lk_mcp';

/**
 * No access cookie but a refresh cookie: the hook's silent refresh could not reach Go (a rejected
 * one clears the refresh cookie), so the session is NOT known to be over. Callers keep the user's
 * form / page (503) instead of sending them to /signin.
 */
export function sessionRenewalPending(cookies: Cookies): boolean {
	return !cookies.get(ACCESS_COOKIE()) && Boolean(cookies.get(REFRESH_COOKIE));
}

/**
 * Neither session cookie is present: the session is over (a rejected refresh clears both, and the
 * CSRF cookie with them). Callers answer "your session ended" first, never "your CSRF token is out of
 * date", which would send the user to reload a page that can only lead back to sign-in.
 */
export function sessionEnded(cookies: Cookies): boolean {
	return !cookies.get(ACCESS_COOKIE()) && !cookies.get(REFRESH_COOKIE);
}

/** Go access JWT lifetime (internal/identity/app/jwt/jwt.go:30). */
const ACCESS_MAX_AGE = 10 * 60;
/** Go refresh family: 14 days, rolling — every refresh re-sets the cookie (backend-checklist #13). */
const REFRESH_MAX_AGE = 14 * 24 * 3600;
/** Path used before 2026-11; cleared on logout so stale cookies disappear. */
const LEGACY_REFRESH_PATH = '/auth/refresh';

export function setAuthCookies(
	cookies: Cookies,
	access: string,
	refresh: string,
	opts: { keepCsrf?: boolean } = {}
): void {
	const secure = isProd();

	cookies.set(ACCESS_COOKIE(), access, {
		path: '/',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: ACCESS_MAX_AGE
	});
	// Path=/ so the proxy, the (app) layout and /auth/logout all receive it.
	cookies.set(REFRESH_COOKIE, refresh, {
		path: '/',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: REFRESH_MAX_AGE
	});
	// Rotating csrf on refresh would break requests already in flight with
	// the old header, so a refresh keeps the existing VALUE — but re-sets it
	// so its expiry renews with the session instead of lapsing 14 days after
	// login (rolling, like the refresh cookie). Lives as long as the session: a 10-minute csrf cookie made every
	// mutation fail with 403 once the first access token expired.
	const existing = opts.keepCsrf ? cookies.get(CSRF_COOKIE) : undefined;
	const csrf =
		existing ?? Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
	cookies.set(CSRF_COOKIE, csrf, {
		path: '/',
		httpOnly: false,
		secure,
		sameSite: 'strict',
		maxAge: REFRESH_MAX_AGE
	});
}

export function clearAuthCookies(cookies: Cookies): void {
	cookies.delete(ACCESS_COOKIE(), { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: LEGACY_REFRESH_PATH });
	cookies.delete(CSRF_COOKIE, { path: '/' });
	cookies.delete(MCP_COOKIE, { path: '/' });
}

/** Long enough for the redirect to the sign-in page; a notice nobody read does not greet a later visit. */
const SIGNIN_NOTICE_MAX_AGE = 120;

/**
 * Why the session ended, for the sign-in page to say once (`api/signin-notice.ts`). Set beside the
 * clearing of the session cookies when a session is over (`endSession` in auth-refresh.ts), never by
 * a sign-out the person asked for.
 *
 * The value is a name from the fixed list or the cookie is not set at all: no token, no id and no
 * text from the API can ride on it. Scoped to the sign-in page and gone after two minutes. It is not
 * httpOnly (the owner-approved attribute list); nothing depends on that, the reader is
 * `takeSigninNotice` below.
 */
export function setSigninNotice(cookies: Cookies, notice: unknown): void {
	const value = signinNoticeOf(notice);
	if (value === null) return;
	cookies.set(SIGNIN_NOTICE_COOKIE, value, {
		path: SIGNIN_NOTICE_PATH,
		httpOnly: false,
		secure: isProd(),
		sameSite: 'lax',
		maxAge: SIGNIN_NOTICE_MAX_AGE
	});
}

/** A sign-in that succeeded has nothing left to explain: drop a notice the page did not take. */
export function clearSigninNotice(cookies: Cookies): void {
	cookies.delete(SIGNIN_NOTICE_COOKIE, { path: SIGNIN_NOTICE_PATH });
}

/**
 * The sign-in page's one read: the notice the cookie names (null for anything off the list), and
 * the cookie is deleted whatever it held, so the sentence is said once. Without a cookie nothing is
 * written.
 */
export function takeSigninNotice(cookies: Cookies): SigninNotice | null {
	const raw = cookies.get(SIGNIN_NOTICE_COOKIE);
	if (raw === undefined) return null;
	clearSigninNotice(cookies);
	return signinNoticeOf(raw);
}

/**
 * Forced password change pending (set at login, cleared on success).
 *
 * UX gate only: the (app) layout uses it to redirect pages. API calls through
 * /api/* are NOT blocked by it, so the Go API must itself enforce forced
 * password change.
 */
export function setMustChangePassword(cookies: Cookies, on: boolean): void {
	if (!on) {
		cookies.delete(MCP_COOKIE, { path: '/' });
		return;
	}
	cookies.set(MCP_COOKIE, '1', {
		path: '/',
		httpOnly: true,
		secure: isProd(),
		sameSite: 'strict',
		maxAge: REFRESH_MAX_AGE
	});
}

export function mustChangePassword(cookies: Cookies): boolean {
	return cookies.get(MCP_COOKIE) === '1';
}
