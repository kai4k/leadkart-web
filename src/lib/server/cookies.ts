/**
 * Server-only cookie helpers for BFF auth.
 * Imported by SvelteKit server endpoints only (not client code).
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * Issues the three auth cookies (__Host-lk_access, lk_refresh, lk_csrf).
 *
 * secure flag: true in production (requires HTTPS). In Vite dev (HTTP),
 * cookies with secure:true are silently rejected. Set false when
 * NODE_ENV !== 'production' so local dev works over plain HTTP.
 */
export function setAuthCookies(cookies: Cookies, access: string, refresh: string): void {
	const secure = env.NODE_ENV === 'production';

	cookies.set('__Host-lk_access', access, {
		path: '/',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: 900 // 15 min
	});
	cookies.set('lk_refresh', refresh, {
		path: '/auth/refresh',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: 30 * 24 * 3600 // 30 days
	});
	// CSRF: random 32-byte base64url. Non-httpOnly so JS can read + echo
	// it as X-CSRF-Token header on mutations (double-submit-cookie pattern).
	const csrf = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
	cookies.set('lk_csrf', csrf, {
		path: '/',
		httpOnly: false,
		secure,
		sameSite: 'strict',
		maxAge: 900 // matches access token TTL
	});
}

/**
 * Clears all auth cookies. Called when refresh fails or on logout.
 */
export function clearAuthCookies(cookies: Cookies): void {
	cookies.delete('__Host-lk_access', { path: '/' });
	cookies.delete('lk_refresh', { path: '/auth/refresh' });
	cookies.delete('lk_csrf', { path: '/' });
}
