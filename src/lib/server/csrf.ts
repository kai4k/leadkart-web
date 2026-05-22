/**
 * Constant-time string comparison for CSRF token verification.
 * Prevents trivial timing oracles even though the token entropy
 * (256 bits, base64url) makes any practical attack infeasible.
 */

import { timingSafeEqual } from 'node:crypto';

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
