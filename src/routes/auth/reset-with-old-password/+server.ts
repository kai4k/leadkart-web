/**
 * BFF reset-password endpoint — POST /auth/reset-with-old-password
 *
 * Public route (no auth required). User submits email + old password +
 * new password. The BFF forwards to Go which verifies the old password
 * and rotates the credential. Returns 204 on success.
 *
 * No CSRF gate — same as /auth/login. The user has no session cookies
 * yet; double-submit CSRF only protects authenticated mutations under
 * the catch-all proxy.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
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
		resp = await fetch(`${config.GO_API_URL}/api/v1/auth/reset-with-old-password`, {
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
		// Forward Go's error body verbatim so the client can parse code + message
		const errorBody = await resp.text();
		return new Response(errorBody, {
			status: resp.status,
			headers: { 'content-type': resp.headers.get('content-type') ?? 'application/json' }
		});
	}

	// 204 No Content — Response constructor rejects body on 204, so use null
	return new Response(null, { status: 204 });
};
