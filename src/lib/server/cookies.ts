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
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { Cookies } from '@sveltejs/kit';
import { isProd } from './config';

export const ACCESS_COOKIE = (): string => (isProd() ? '__Host-lk_access' : 'lk_access');
export const REFRESH_COOKIE = 'lk_refresh';
export const CSRF_COOKIE = 'lk_csrf';
const MCP_COOKIE = 'lk_mcp';

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 3600;
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
	// so its expiry renews with the session instead of lapsing 30 days after
	// login. Lives as long as the session: a 15-minute csrf cookie made every
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
