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
		resp = await fetch(`${config.GO_API_URL}/api/v1/auth/reset-password`, {
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
