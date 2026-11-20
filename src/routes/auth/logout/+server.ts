/**
 * BFF logout endpoint — POST /auth/logout
 *
 * 1. CSRF-verified — caller must echo the lk_csrf cookie back as
 *    X-CSRF-Token. Otherwise a cross-site `<img src=/auth/logout>`
 *    could force-logout the user. Without JavaScript (the error page's
 *    sign-out form) the same value comes as the form field `csrf`; it is held to
 *    the same equal-to-cookie rule, and SvelteKit's origin check (`csrf.trustedOrigins`
 *    is unset, so it is on) refuses a cross-site form POST before this runs.
 *    There is no GET logout.
 * 2. Best-effort revoke against Go (ignored on failure).
 * 3. Cookies unconditionally cleared — operator scope cookie included.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { goAuthFetch } from '#lib/server/go.ts';
import { clearAuthCookies, REFRESH_COOKIE } from '#lib/server/cookies.ts';
import { clearOperatorScope } from '#lib/server/scope.ts';
import { assertCsrf } from '#lib/server/csrf.ts';

const isFormPost = (request: Request): boolean => {
	const type = request.headers.get('content-type') ?? '';
	return (
		type.startsWith('application/x-www-form-urlencoded') || type.startsWith('multipart/form-data')
	);
};

export const POST: RequestHandler = async (event) => {
	// A browser form post (no header possible) carries the token in the body.
	const form = isFormPost(event.request) ? await event.request.formData().catch(() => null) : null;
	const field = form?.get('csrf');
	const csrfFail = assertCsrf(event, typeof field === 'string' ? field : undefined);
	if (csrfFail) return csrfFail;

	const refresh = event.cookies.get(REFRESH_COOKIE);
	if (refresh) {
		await goAuthFetch('/v1/auth/logout', { body: { refresh_token: refresh } }).catch(() => {
			// Logout is local even if Go is unreachable
		});
	}

	clearAuthCookies(event.cookies);
	clearOperatorScope(event.cookies);

	// The form post navigated here: send the browser on. The fetch caller reads the JSON.
	if (form) redirect(303, '/signin');
	return Response.json({ ok: true });
};
