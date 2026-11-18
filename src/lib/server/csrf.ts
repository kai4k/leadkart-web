/**
 * Constant-time string comparison for CSRF token verification.
 * Prevents trivial timing oracles even though the token entropy
 * (256 bits, base64url) makes any practical attack infeasible.
 */

import { timingSafeEqual } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { CSRF_COOKIE } from './cookies.ts';
import { jsonError } from './http.ts';

export function timingSafeEqualString(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ab.length !== bb.length) {
		// length mismatch — still consume time, then bail
		timingSafeEqual(ab, ab);
		return false;
	}
	return timingSafeEqual(ab, bb);
}

/**
 * Double-submit-cookie check for mutating BFF routes: the `X-CSRF-Token`
 * header must equal the `lk_csrf` cookie. Returns the 403 response to send,
 * or null when the request passes. The one implementation (proxy, logout,
 * operator scope).
 */
export function assertCsrf(event: Pick<RequestEvent, 'request' | 'cookies'>): Response | null {
	const header = event.request.headers.get('x-csrf-token');
	const cookie = event.cookies.get(CSRF_COOKIE);
	if (!header || !cookie || !timingSafeEqualString(header, cookie)) {
		return jsonError(403, 'csrf_mismatch', 'CSRF token missing or invalid');
	}
	return null;
}
