/**
 * BFF login endpoint — POST /auth/login
 *
 * Receives {email, password} from the browser, forwards to Go's
 * /api/v1/auth/login, and sets the three auth cookies on success.
 * The browser NEVER receives access_token or refresh_token in the
 * response body — they are confined to httpOnly cookies.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
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
		resp = await fetch(`${env.GO_API_URL}/api/v1/auth/login`, {
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
		// Forward Go's error body verbatim so the client can parse ProblemDetails
		const errorBody = await resp.text();
		return new Response(errorBody, {
			status: resp.status,
			headers: { 'content-type': resp.headers.get('content-type') ?? 'application/json' }
		});
	}

	const tokens = (await resp.json()) as { access_token: string; refresh_token: string };
	setAuthCookies(event.cookies, tokens.access_token, tokens.refresh_token);

	// Return only a success acknowledgement — tokens are in cookies, not the body
	return json({ ok: true });
};
