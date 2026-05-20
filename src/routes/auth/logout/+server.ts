/**
 * BFF logout endpoint — POST /auth/logout
 *
 * Attempts a best-effort server-side token revocation via Go's logout
 * endpoint, then unconditionally clears all three auth cookies. The
 * cookie deletion is the primary security action — revocation failure
 * does not prevent the user from being logged out on this device.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { clearAuthCookies } from '$lib/server/cookies';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
	const refresh = event.cookies.get('lk_refresh');

	if (refresh) {
		// Best-effort revoke — ignore errors (we clear cookies regardless).
		// Go's revoke invalidates the refresh token family server-side so
		// the user can't re-use the refresh token on another device.
		await fetch(`${env.GO_API_URL}/api/v1/auth/logout`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: refresh })
		}).catch(() => {
			// Intentionally swallowed — logout is local even if Go is down
		});
	}

	// Clear all three cookies regardless of revoke outcome
	clearAuthCookies(event.cookies);

	return json({ ok: true });
};
