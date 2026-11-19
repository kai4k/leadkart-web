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
import { goAuthFetch } from '#lib/server/go.ts';
import { clearAuthCookies, REFRESH_COOKIE } from '#lib/server/cookies.ts';
import { clearOperatorScope } from '#lib/server/scope.ts';
import { assertCsrf } from '#lib/server/csrf.ts';

export const POST: RequestHandler = async (event) => {
	const csrfFail = assertCsrf(event);
	if (csrfFail) return csrfFail;

	const refresh = event.cookies.get(REFRESH_COOKIE);
	if (refresh) {
		await goAuthFetch('/v1/auth/logout', { body: { refresh_token: refresh } }).catch(() => {
			// Logout is local even if Go is unreachable
		});
	}

	clearAuthCookies(event.cookies);
	clearOperatorScope(event.cookies);

	return Response.json({ ok: true });
};
