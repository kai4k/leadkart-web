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
import { jsonError, upstreamJsonError } from '#lib/server/http.ts';
import { confirmEmailChangeBodySchema } from '$features/auth/schemas';

export const POST: RequestHandler = async (event) => {
	let json: unknown;
	try {
		json = await event.request.json();
	} catch {
		return jsonError(400, 'invalid_json', 'Request body must be valid JSON');
	}
	// Only the emailed token goes to Go, bounded: never the caller's body verbatim.
	const body = confirmEmailChangeBodySchema.safeParse(json);
	if (!body.success) return jsonError(400, 'invalid_body', 'A confirmation token is required');

	let resp: Response;
	try {
		resp = await goAuthFetch('/v1/auth/confirm-email-change', { body: body.data });
	} catch (err) {
		return upstreamJsonError(err);
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
