/**
 * BFF login endpoint — POST /auth/login
 *
 * 1. Forwards {email, password} to Go's /api/v1/auth/login.
 * 2. On 200: sets the three auth cookies (access, refresh, csrf) and
 *    returns `{ ok: true, must_change_password: boolean }` so the
 *    browser can route to the force-change-password page when needed.
 *    Tokens stay opaque to JS.
 * 3. On 423 (account locked): forwards the Retry-After header so the
 *    signin form can render "try again in N seconds" per ADR 0053 +
 *    NIST 800-63B §5.2.2.
 * 4. On other 4xx: forwards Go's ProblemDetails body verbatim.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { RequestHandler } from './$types';
import { config } from '$lib/server/config';
import { setAuthCookies } from '$lib/server/cookies';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return json(
			{ error: 'invalid_json', message: 'Request body must be valid JSON' },
			{ status: 400 }
		);
	}

	let resp: Response;
	try {
		resp = await fetch(`${config.GO_API_URL}/api/v1/auth/login`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
	} catch {
		return json(
			{ error: 'upstream_unavailable', message: 'Go API is unreachable' },
			{ status: 502 }
		);
	}

	if (!resp.ok) {
		const errorBody = await resp.text();
		const headers = new Headers({
			'content-type': resp.headers.get('content-type') ?? 'application/json'
		});
		// 423 carries Retry-After (delta-seconds) — forward to the browser
		// so the form can render a useful countdown.
		const retryAfter = resp.headers.get('retry-after');
		if (retryAfter) headers.set('retry-after', retryAfter);
		return new Response(errorBody, { status: resp.status, headers });
	}

	const tokens = (await resp.json()) as {
		access_token: string;
		refresh_token: string;
		must_change_password?: boolean;
	};
	setAuthCookies(event.cookies, tokens.access_token, tokens.refresh_token);

	// Browser sees only acknowledgement + the force-change hint.
	return json({ ok: true, must_change_password: tokens.must_change_password ?? false });
};
