/**
 * BFF logout endpoint — POST /auth/logout
 *
 * 1. CSRF-verified — caller must echo the lk_csrf cookie back as
 *    X-CSRF-Token. Otherwise a cross-site `<img src=/auth/logout>`
 *    could force-logout the user.
 * 2. Best-effort revoke against Go (ignored on failure).
 * 3. Cookies unconditionally cleared — operator scope cookie included.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { RequestHandler } from './$types';
import { config } from '$lib/server/config';
import { clearAuthCookies } from '$lib/server/cookies';
import { clearOperatorScope } from '$lib/server/scope';
import { timingSafeEqualString } from '$lib/server/csrf';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
	const headerCsrf = event.request.headers.get('x-csrf-token');
	const cookieCsrf = event.cookies.get('lk_csrf');
	if (!headerCsrf || !cookieCsrf || !timingSafeEqualString(headerCsrf, cookieCsrf)) {
		return json({ error: 'csrf_mismatch' }, { status: 403 });
	}

	const refresh = event.cookies.get('lk_refresh');
	if (refresh) {
		await fetch(`${config.GO_API_URL}/api/v1/auth/logout`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: refresh })
		}).catch(() => {
			// Logout is local even if Go is unreachable
		});
	}

	clearAuthCookies(event.cookies);
	clearOperatorScope(event.cookies);

	return json({ ok: true });
};
