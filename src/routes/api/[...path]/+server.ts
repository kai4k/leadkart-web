/**
 * BFF transparent proxy — catches all browser API calls at /api/[...path]
 * and forwards them to the Go backend with a Bearer token extracted from
 * the httpOnly __Host-lk_access cookie.
 *
 * Responsibilities:
 *   1. CSRF validation on mutating methods (POST/PUT/PATCH/DELETE)
 *   2. Bearer token injection for server-to-server calls to Go
 *   3. Transparent 401 → refresh → retry (once) before surfacing to browser
 *   4. Pass-through of request body, query params, content-type, accept
 *
 * The browser never reads a JWT. Cookies are the auth transport; this
 * module is the only code that touches the raw token values.
 *
 * Per ADR: docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md
 */

import type { RequestEvent } from './$types';
import { env } from '$env/dynamic/private';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Issues the three auth cookies (__Host-lk_access, lk_refresh, lk_csrf).
 * Shared by the proxy (on refresh) and the /auth/login endpoint.
 *
 * secure flag: true in production (HTTPS). In Vite dev (HTTP), cookies
 * with secure:true are silently rejected by the browser. Set false when
 * NODE_ENV !== 'production' so local dev works.
 */
export function setAuthCookies(event: RequestEvent, access: string, refresh: string): void {
	const secure = env.NODE_ENV === 'production';

	event.cookies.set('__Host-lk_access', access, {
		path: '/',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: 900 // 15 min
	});
	event.cookies.set('lk_refresh', refresh, {
		path: '/auth/refresh',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: 30 * 24 * 3600 // 30 days
	});
	// CSRF: random 32-byte base64url. Non-httpOnly so JS can read + echo
	// it as X-CSRF-Token header on mutations (double-submit-cookie pattern).
	const csrf = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
	event.cookies.set('lk_csrf', csrf, {
		path: '/',
		httpOnly: false,
		secure,
		sameSite: 'strict',
		maxAge: 900 // matches access token TTL
	});
}

/**
 * Clears all auth cookies. Called when refresh fails — forces re-login.
 */
function clearAuthCookies(event: RequestEvent): void {
	event.cookies.delete('__Host-lk_access', { path: '/' });
	event.cookies.delete('lk_refresh', { path: '/auth/refresh' });
	event.cookies.delete('lk_csrf', { path: '/' });
}

/**
 * Attempts a silent token refresh using the lk_refresh cookie.
 * On success: rotates all three cookies and returns true.
 * On failure: clears cookies and returns false (caller should surface 401).
 */
async function tryRefresh(event: RequestEvent): Promise<boolean> {
	const refresh = event.cookies.get('lk_refresh');
	if (!refresh) return false;

	let resp: Response;
	try {
		resp = await fetch(`${env.GO_API_URL}/api/v1/auth/refresh`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refresh_token: refresh })
		});
	} catch {
		// Network error reaching Go — cannot refresh
		return false;
	}

	if (!resp.ok) {
		clearAuthCookies(event);
		return false;
	}

	const tokens = (await resp.json()) as { access_token: string; refresh_token: string };
	setAuthCookies(event, tokens.access_token, tokens.refresh_token);
	return true;
}

/**
 * Core proxy logic. `attempt` is 1 on first try, 2 on the post-refresh
 * retry — prevents infinite loops if refresh returns 401 too.
 */
async function proxy(event: RequestEvent, attempt = 1): Promise<Response> {
	const { cookies, request, params } = event;
	// params.path is the catch-all rest segment (everything after /api/)
	const path = (params as { path: string }).path;

	// ── CSRF gate on mutations ──────────────────────────────────────────
	if (MUTATING.has(request.method)) {
		const headerCsrf = request.headers.get('x-csrf-token');
		const cookieCsrf = cookies.get('lk_csrf');
		if (!headerCsrf || !cookieCsrf || headerCsrf !== cookieCsrf) {
			return new Response(
				JSON.stringify({ error: 'csrf_mismatch', message: 'CSRF token missing or invalid' }),
				{ status: 403, headers: { 'content-type': 'application/json' } }
			);
		}
	}

	// ── Build upstream request ──────────────────────────────────────────
	const upstreamUrl = `${env.GO_API_URL}/api/${path}${new URL(request.url).search}`;
	const upstreamHeaders = new Headers();

	const access = cookies.get('__Host-lk_access');
	if (access) upstreamHeaders.set('authorization', `Bearer ${access}`);

	const ct = request.headers.get('content-type');
	if (ct) upstreamHeaders.set('content-type', ct);
	upstreamHeaders.set('accept', 'application/json');

	// Forward X-Tenant-Id if browser sent it (operator scope override)
	const tenantId = request.headers.get('x-tenant-id');
	if (tenantId) upstreamHeaders.set('x-tenant-id', tenantId);

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

	// ── 401 → refresh + single retry ───────────────────────────────────
	if (upstream.status === 401 && attempt === 1) {
		const refreshed = await tryRefresh(event);
		if (refreshed) return proxy(event, 2);
		// Refresh failed — clear cookies, let browser handle redirect
	}

	// ── Stream response back to browser ────────────────────────────────
	const responseBody = await upstream.arrayBuffer();
	const responseHeaders = new Headers();
	const upstreamCt = upstream.headers.get('content-type');
	if (upstreamCt) responseHeaders.set('content-type', upstreamCt);

	return new Response(responseBody, { status: upstream.status, headers: responseHeaders });
}

// SvelteKit requires named exports for each HTTP method
export const GET = (e: RequestEvent) => proxy(e);
export const POST = (e: RequestEvent) => proxy(e);
export const PUT = (e: RequestEvent) => proxy(e);
export const PATCH = (e: RequestEvent) => proxy(e);
export const DELETE = (e: RequestEvent) => proxy(e);
