/**
 * BFF — POST /auth/request-password-reset
 *
 * Public route. Forwards `{ email }` to Go; Go always returns 204 regardless
 * of whether the email is registered (Auth0/Okta canon per backend ADR — defeats
 * account enumeration). Frontend shows the same success copy either way.
 *
 * No CSRF gate — same bootstrap class as /auth/login.
 *
 * Per backend ADR 0050 + spec: POST /api/v1/auth/request-password-reset
 */

import type { RequestHandler } from './$types';
import { config } from '#lib/server/config.ts';

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
		resp = await fetch(`${config.GO_API_URL}/api/v1/auth/request-password-reset`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
	} catch {
		return Response.json(
			{ error: 'upstream_unavailable', message: 'Go API is unreachable' },
			{ status: 502 }
		);
	}

	if (!resp.ok) {
		const errorBody = await resp.text();
		return new Response(errorBody, {
			status: resp.status,
			headers: { 'content-type': resp.headers.get('content-type') ?? 'application/json' }
		});
	}

	return new Response(null, { status: 204 });
};
