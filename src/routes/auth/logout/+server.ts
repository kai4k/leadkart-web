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
import { config } from '#lib/server/config.ts';
import { clearAuthCookies, REFRESH_COOKIE } from '#lib/server/cookies.ts';
import { clearOperatorScope } from '#lib/server/scope.ts';
import { assertCsrf } from '#lib/server/csrf.ts';

export const POST: RequestHandler = async (event) => {
	const csrfFail = assertCsrf(event);
	if (csrfFail) return csrfFail;

	const refresh = event.cookies.get(REFRESH_COOKIE);
	if (refresh) {
		await fetch(`${config.GO_API_URL}/api/v1/auth/logout`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: refresh }),
			signal: AbortSignal.timeout(config.UPSTREAM_TIMEOUT_MS)
		}).catch(() => {
			// Logout is local even if Go is unreachable
		});
	}

	clearAuthCookies(event.cookies);
	clearOperatorScope(event.cookies);

	return Response.json({ ok: true });
};
