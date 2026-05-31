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
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { Cookies } from '@sveltejs/kit';
import { isProd } from './config';

export const ACCESS_COOKIE = (): string => (isProd() ? '__Host-lk_access' : 'lk_access');
const REFRESH_COOKIE = 'lk_refresh';
const CSRF_COOKIE = 'lk_csrf';

export function setAuthCookies(cookies: Cookies, access: string, refresh: string): void {
	const secure = isProd();

	cookies.set(ACCESS_COOKIE(), access, {
		path: '/',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: 900 // 15 min
	});
	cookies.set(REFRESH_COOKIE, refresh, {
		path: '/auth/refresh',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: 30 * 24 * 3600 // 30 days
	});
	const csrf = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
	cookies.set(CSRF_COOKIE, csrf, {
		path: '/',
		httpOnly: false,
		secure,
		sameSite: 'strict',
		maxAge: 900
	});
}

export function clearAuthCookies(cookies: Cookies): void {
	cookies.delete(ACCESS_COOKIE(), { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: '/auth/refresh' });
	cookies.delete(CSRF_COOKIE, { path: '/' });
}
