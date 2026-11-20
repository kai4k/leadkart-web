/**
 * BFF transparent proxy — catches all browser API calls at /api/[...path]
 * and forwards them to the Go backend with a Bearer token extracted from
 * the httpOnly __Host-lk_access cookie.
 *
 * Responsibilities:
 *   1. CSRF validation on mutating methods (POST/PUT/PATCH/DELETE) via
 *      assertCsrf (constant-time comparison).
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
import { ACCESS_COOKIE } from '#lib/server/cookies.ts';
import { isAuthExpired, refreshSession } from '#lib/server/auth-refresh.ts';
import { SESSION_EXPIRED_CODE } from '#lib/api/errors.ts';
import { SCOPE_EXPIRED_MESSAGE } from '#lib/api/scope-header.ts';
import { readOperatorScope } from '#lib/server/scope.ts';
import { assertCsrf } from '#lib/server/csrf.ts';
import { jsonError, upstreamJsonError } from '#lib/server/http.ts';
import {
	buildUpstreamUrl,
	isTokenEndpoint,
	pickResponseHeaders,
	scopeRequired,
	scrubsTokens,
	stripTokenFields,
	upstreamStatus,
	upstreamTimeout
} from '#lib/server/proxy.ts';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const NULL_BODY_STATUSES = new Set([204, 205, 304]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
/** A 3xx is relayed only for reads: a 307/308 on a mutation would make the browser replay it elsewhere. */
const REDIRECTABLE_METHODS = new Set(['GET', 'HEAD']);

/** 504/502 for a failed upstream call, logged without query string, headers or body. */
function upstreamErrorResponse(err: unknown, method: string, path: string): Response {
	const status = upstreamStatus(err);
	console.warn('[bff-proxy]', status, method, `/${path}`);
	return upstreamJsonError(err);
}

async function proxy(
	event: RequestEvent,
	attempt = 1,
	bufferedBody?: ArrayBuffer
): Promise<Response> {
	const { cookies, request, params } = event;
	const path = params.path;

	if (MUTATING.has(request.method)) {
		const csrfFail = assertCsrf(event);
		if (csrfFail) return csrfFail;
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
	// built from scratch. Fail closed: an invalid cookie, or a request from
	// the scope tree with no valid cookie, never runs in the operator's home
	// tenant. The invalid cookie is NOT cleared, so every later call keeps
	// getting 409 until the user exits scope or selects a tenant again.
	const scope = readOperatorScope(cookies);
	if (scope.state === 'invalid' || (scope.state === 'none' && scopeRequired(request.headers))) {
		return jsonError(409, 'scope_invalid', SCOPE_EXPIRED_MESSAGE);
	}
	if (scope.state === 'valid') upstreamHeaders.set('x-tenant-id', scope.scope.id);

	// Buffered once so the request can be replayed after a refresh.
	const body = MUTATING.has(request.method)
		? (bufferedBody ?? (await request.arrayBuffer()))
		: undefined;

	// Redirects are never followed: a 3xx from Go must not make the BFF fetch
	// another host with the tenant header attached.
	const timeout = upstreamTimeout(request.signal, config.UPSTREAM_TIMEOUT_MS);
	let upstream: Response;
	try {
		upstream = await fetch(upstreamUrl, {
			method: request.method,
			headers: upstreamHeaders,
			body: body ?? null,
			redirect: 'manual',
			signal: timeout.signal
		});
	} catch (err) {
		// The browser went away: nothing to report and nobody to answer.
		if (request.signal.aborted) return new Response(null, { status: 499 });
		return upstreamErrorResponse(err, request.method, path);
	} finally {
		// Headers in (or the call failed): stop the clock either way.
		timeout.headersReceived();
	}

	if (isAuthExpired(upstream)) {
		if (attempt === 1) {
			const refreshed = await refreshSession(cookies);
			if (refreshed.ok) {
				await upstream.body?.cancel();
				return proxy(event, 2, body);
			}
			if (refreshed.reason === 'unavailable') {
				// Go is down or slow, not the session: keep the cookies and let the
				// client retry instead of signing the user out.
				await upstream.body?.cancel();
				return jsonError(503, 'refresh_unavailable', 'Session could not be renewed — try again');
			}
		}
		// Refresh rejected, no refresh cookie, or the renewed token was refused too:
		// the session is over. Tagged so the client signs out only for this 401.
		await upstream.body?.cancel();
		return jsonError(401, SESSION_EXPIRED_CODE, 'Your session has expired');
	}

	const headers = pickResponseHeaders(upstream.headers, config.GO_API_URL);
	if (REDIRECT_STATUSES.has(upstream.status)) {
		await upstream.body?.cancel();
		if (!REDIRECTABLE_METHODS.has(request.method)) {
			return jsonError(502, 'upstream_redirect', 'Go API answered a write with a redirect');
		}
		if (!headers.has('location')) {
			return jsonError(502, 'upstream_redirect', 'Go API returned an unusable redirect');
		}
		return new Response(null, { status: upstream.status, headers });
	}
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
