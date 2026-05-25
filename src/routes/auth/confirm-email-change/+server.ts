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
import { config } from '$lib/server/config';
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
		resp = await fetch(`${config.GO_API_URL}/api/v1/auth/confirm-email-change`, {
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
		return new Response(errorBody, {
			status: resp.status,
			headers: { 'content-type': resp.headers.get('content-type') ?? 'application/json' }
		});
	}

	return new Response(null, { status: 204 });
};
