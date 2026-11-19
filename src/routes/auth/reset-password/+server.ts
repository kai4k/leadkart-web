/**
 * BFF — POST /auth/reset-password
 *
 * Public route. User clicks the link emailed by Go (carrying a one-shot signed
 * token), enters a new password, and POSTs { token, new_password } here. We
 * forward to Go's POST /api/v1/auth/reset-password.
 *
 * No CSRF gate — pre-auth bootstrap path. The token itself is the secret.
 *
 * Per backend ADR 0050 + spec.
 */

import type { RequestHandler } from './$types';
import { goAuthFetch, goErrorStatus } from '#lib/server/go.ts';
import { jsonError } from '#lib/server/http.ts';
import { isUpstreamTimeout } from '#lib/server/proxy.ts';

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
		resp = await goAuthFetch('/v1/auth/reset-password', { body });
	} catch (err) {
		return isUpstreamTimeout(err)
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
