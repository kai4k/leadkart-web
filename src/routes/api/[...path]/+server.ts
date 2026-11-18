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
 *   5. Path validation (buildUpstreamUrl): only plain /api/v1/... paths
 *      reach Go; token-issuing endpoints are blocked, and the
 *      impersonation-start response is scrubbed of token fields.
 *   6. Header allowlists both ways, upstream timeout, streamed responses.
 *   7. Fail closed on an invalid operator-scope cookie (409 scope_invalid).
 *
 * The browser never reads a JWT, never knows the active tenant UUID,
 * never sees a slug in a URL path it didn't choose to type. The proxy
 * is the only code that touches raw token values OR operator scope state.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { RequestEvent } from './$types';
import { config } from '#lib/server/config.ts';
import { ACCESS_COOKIE, CSRF_COOKIE } from '#lib/server/cookies.ts';
import { isAuthExpired, refreshSession } from '#lib/server/auth-refresh.ts';
import { clearOperatorScope, readOperatorScope } from '#lib/server/scope.ts';
import { timingSafeEqualString } from '#lib/server/csrf.ts';
import { jsonError } from '#lib/server/http.ts';
import {
	buildUpstreamUrl,
	isTokenEndpoint,
	pickResponseHeaders,
	scrubsTokens,
	stripTokenFields,
	upstreamSignal
} from '#lib/server/proxy.ts';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

async function proxy(
	event: RequestEvent,
	attempt = 1,
	bufferedBody?: ArrayBuffer
): Promise<Response> {
	const { cookies, request, params } = event;
	const path = params.path;

	if (MUTATING.has(request.method)) {
		const headerCsrf = request.headers.get('x-csrf-token');
		const cookieCsrf = cookies.get(CSRF_COOKIE);
		if (!headerCsrf || !cookieCsrf || !timingSafeEqualString(headerCsrf, cookieCsrf)) {
			return jsonError(403, 'csrf_mismatch', 'CSRF token missing or invalid');
		}
	}

	if (isTokenEndpoint(path)) return jsonError(404, 'not_found', 'Not found');

	const upstreamUrl = buildUpstreamUrl(config.GO_API_URL, path, new URL(request.url).search);
	if (!upstreamUrl) return jsonError(400, 'invalid_path', 'Invalid API path');

	const upstreamHeaders = new Headers({ accept: 'application/json' });
	const access = cookies.get(ACCESS_COOKIE());
	if (access) upstreamHeaders.set('authorization', `Bearer ${access}`);
	const contentType = request.headers.get('content-type');
	if (contentType) upstreamHeaders.set('content-type', contentType);

	// Operator scope is trusted only from the signed cookie. Any
	// X-Tenant-Id sent by the browser is ignored: the headers above are
	// built from scratch. An invalid cookie fails closed — forwarding
	// without the header would run the call in the operator's home tenant.
	const scope = readOperatorScope(cookies);
	if (scope.state === 'invalid') {
		clearOperatorScope(cookies);
		return jsonError(409, 'scope_invalid', 'Operator scope expired — select the tenant again');
	}
	if (scope.state === 'valid') upstreamHeaders.set('x-tenant-id', scope.scope.id);

	// Buffered once so the request can be replayed after a refresh.
	const body = MUTATING.has(request.method)
		? (bufferedBody ?? (await request.arrayBuffer()))
		: undefined;

	let upstream: Response;
	try {
		upstream = await fetch(upstreamUrl, {
			method: request.method,
			headers: upstreamHeaders,
			body: body ?? null,
			signal: upstreamSignal(request, config.UPSTREAM_TIMEOUT_MS)
		});
	} catch (err) {
		return err instanceof DOMException && err.name === 'TimeoutError'
			? jsonError(504, 'upstream_timeout', 'Go API did not respond in time')
			: jsonError(502, 'upstream_unavailable', 'Go API is unreachable');
	}

	if (attempt === 1 && isAuthExpired(upstream)) {
		await upstream.body?.cancel();
		if (await refreshSession(cookies)) return proxy(event, 2, body);
	}

	const headers = pickResponseHeaders(upstream.headers);
	if (NULL_BODY_STATUSES.has(upstream.status)) {
		return new Response(null, { status: upstream.status, headers });
	}
	if (upstream.ok && scrubsTokens(request.method, path)) {
		const data: unknown = await upstream.json().catch(() => null);
		return Response.json(stripTokenFields(data), { status: upstream.status, headers });
	}
	// Streamed straight through: no buffering of large exports.
	return new Response(upstream.body, { status: upstream.status, headers });
}

export const GET = (e: RequestEvent) => proxy(e);
export const POST = (e: RequestEvent) => proxy(e);
export const PUT = (e: RequestEvent) => proxy(e);
export const PATCH = (e: RequestEvent) => proxy(e);
export const DELETE = (e: RequestEvent) => proxy(e);
