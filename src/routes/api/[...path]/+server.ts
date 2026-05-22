/**
 * BFF transparent proxy — catches all browser API calls at /api/[...path]
 * and forwards them to the Go backend with a Bearer token extracted from
 * the httpOnly __Host-lk_access cookie.
 *
 * Responsibilities:
 *   1. CSRF validation on mutating methods (POST/PUT/PATCH/DELETE) using
 *      constant-time comparison (timingSafeEqual).
 *   2. Bearer token injection for server-to-server calls to Go.
 *   3. Operator scope: auto-inject X-Tenant-Id from the lk_op_tenant
 *      cookie when present. The browser NEVER ships an X-Tenant-Id
 *      header — the BFF is the only writer.
 *   4. Transparent 401 → refresh → retry (once).
 *   5. Pass-through of request body, query params, content-type, accept.
 *
 * The browser never reads a JWT, never knows the active tenant UUID,
 * never sees a slug in a URL path it didn't choose to type. The proxy
 * is the only code that touches raw token values OR operator scope state.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { RequestEvent } from './$types';
import { config } from '$lib/server/config';
import { setAuthCookies, clearAuthCookies, ACCESS_COOKIE } from '$lib/server/cookies';
import { getOperatorScope } from '$lib/server/scope';
import { timingSafeEqualString } from '$lib/server/csrf';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function tryRefresh(event: RequestEvent): Promise<boolean> {
	const refresh = event.cookies.get('lk_refresh');
	if (!refresh) return false;

	let resp: Response;
	try {
		resp = await fetch(`${config.GO_API_URL}/api/v1/auth/refresh`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: refresh })
		});
	} catch {
		return false;
	}

	if (!resp.ok) {
		clearAuthCookies(event.cookies);
		return false;
	}

	const tokens = (await resp.json()) as { access_token: string; refresh_token: string };
	setAuthCookies(event.cookies, tokens.access_token, tokens.refresh_token);
	return true;
}

async function proxy(event: RequestEvent, attempt = 1): Promise<Response> {
	const { cookies, request, params } = event;
	const path = params.path;

	if (MUTATING.has(request.method)) {
		const headerCsrf = request.headers.get('x-csrf-token');
		const cookieCsrf = cookies.get('lk_csrf');
		if (!headerCsrf || !cookieCsrf || !timingSafeEqualString(headerCsrf, cookieCsrf)) {
			return new Response(
				JSON.stringify({ error: 'csrf_mismatch', message: 'CSRF token missing or invalid' }),
				{ status: 403, headers: { 'content-type': 'application/json' } }
			);
		}
	}

	const upstreamUrl = `${config.GO_API_URL}/api/${path}${new URL(request.url).search}`;
	const upstreamHeaders = new Headers();

	const access = cookies.get(ACCESS_COOKIE());
	if (access) upstreamHeaders.set('authorization', `Bearer ${access}`);

	const ct = request.headers.get('content-type');
	if (ct) upstreamHeaders.set('content-type', ct);
	upstreamHeaders.set('accept', 'application/json');

	// Operator-scope tenant override is ONLY trusted from the cookie.
	// We deliberately ignore any X-Tenant-Id header sent by the browser
	// — the BFF is authoritative for scope.
	const scope = getOperatorScope(cookies);
	if (scope) upstreamHeaders.set('x-tenant-id', scope.id);

	let body: ArrayBuffer | undefined;
	if (MUTATING.has(request.method)) {
		body = await request.clone().arrayBuffer();
	}

	let upstream: Response;
	try {
		upstream = await fetch(upstreamUrl, {
			method: request.method,
			headers: upstreamHeaders,
			body: body ?? null
		});
	} catch {
		return new Response(
			JSON.stringify({ error: 'upstream_unavailable', message: 'Go API is unreachable' }),
			{ status: 502, headers: { 'content-type': 'application/json' } }
		);
	}

	if (upstream.status === 401 && attempt === 1) {
		const refreshed = await tryRefresh(event);
		if (refreshed) return proxy(event, 2);
	}

	const responseBody = await upstream.arrayBuffer();
	const responseHeaders = new Headers();
	const upstreamCt = upstream.headers.get('content-type');
	if (upstreamCt) responseHeaders.set('content-type', upstreamCt);

	return new Response(responseBody, { status: upstream.status, headers: responseHeaders });
}

export const GET = (e: RequestEvent) => proxy(e);
export const POST = (e: RequestEvent) => proxy(e);
export const PUT = (e: RequestEvent) => proxy(e);
export const PATCH = (e: RequestEvent) => proxy(e);
export const DELETE = (e: RequestEvent) => proxy(e);
