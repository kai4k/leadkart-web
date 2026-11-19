/**
 * BFF — POST /auth/confirm-email-change
 *
 * Public route. User clicks the link emailed by Go (token is in the URL).
 * Forwards { token } to Go's POST /api/v1/auth/confirm-email-change.
 *
 * No CSRF gate — pre-auth-style bootstrap (the token itself is the secret).
 * The user MAY already be signed in (typical case), but no auth cookie is
 * required to consume the token.
 *
 * Per backend ADR 0050 + spec.
 */

import type { RequestHandler } from './$types';
import { goAuthFetch, goErrorStatus } from '#lib/server/go.ts';
import { jsonError } from '#lib/server/http.ts';
import { upstreamStatus } from '#lib/server/proxy.ts';

export const POST: RequestHandler = async (event) => {
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json(
			{ error: 'invalid_json', message: 'Request body must be valid JSON' },
			{ status: 400 }
		);
	}

	let resp: Response;
	try {
		resp = await goAuthFetch('/v1/auth/confirm-email-change', { body });
	} catch (err) {
		return upstreamStatus(err) === 504
			? jsonError(504, 'upstream_timeout', 'Go API did not answer in time')
			: jsonError(502, 'upstream_unavailable', 'Go API is unreachable');
	}

	if (!resp.ok) {
		const errorBody = await resp.text();
		return new Response(errorBody, {
			status: goErrorStatus(resp),
			headers: { 'content-type': resp.headers.get('content-type') ?? 'application/json' }
		});
	}

	return new Response(null, { status: 204 });
};
