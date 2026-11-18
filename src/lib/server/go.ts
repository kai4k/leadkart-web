/**
 * Server-side Go API helper for SvelteKit `+page.server.ts` load
 * functions and form actions.
 *
 * The BFF proxy at `/api/[...path]/+server.ts` handles browser-side
 * calls: cookie → Bearer + CSRF gate + 401 refresh + tenant header.
 *
 * Form actions and load functions run server-side already; this helper
 * lets them call Go directly with the same auth model (cookie → Bearer)
 * without re-entering the proxy. It also auto-injects the operator
 * scope (X-Tenant-Id) when present so settings/tenant routes work
 * correctly inside /operator/scope/*.
 *
 * Per CLAUDE.md rule 6 + the BFF cookie-auth ADR.
 */
import { redirect, type Cookies } from '@sveltejs/kit';
import { isAuthExpired, refreshSession } from './auth-refresh.ts';
import { config } from './config.ts';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './cookies.ts';
import { upstreamTimeout } from './proxy.ts';
import { clearOperatorScope, readOperatorScope } from './scope.ts';

export interface GoRequestInit extends Omit<RequestInit, 'headers' | 'body'> {
	headers?: Record<string, string>;
	/** String only: the request is replayed after a refresh, so a stream body is not allowed. */
	body?: string;
	/** When true (default), throw redirect(303, '/signin') on missing access cookie. */
	requireAuth?: boolean;
	/** When false, ignore the operator scope cookie (no X-Tenant-Id, no fail-closed redirect). Default true. */
	scoped?: boolean;
}

/**
 * Call Go from a server-side context (load or action handler).
 *
 *   const resp = await goFetch(cookies, '/v1/users/abc', { method: 'GET' });
 *
 * The path MUST start with `/v1/` (the Go API root). Auth + scope
 * headers are injected automatically. The caller handles non-2xx
 * responses. An expiry 401 from Go (see `isAuthExpired`) triggers one silent refresh + one retry with the
 * new Bearer; every body passed here is a string/undefined, so replay is safe.
 */
export async function goFetch(
	cookies: Cookies,
	path: string,
	init: GoRequestInit = {}
): Promise<Response> {
	const access = cookies.get(ACCESS_COOKIE());
	if (!access) {
		if (init.requireAuth !== false) {
			throw redirect(303, '/signin');
		}
	}

	const headers: Record<string, string> = {
		...(init.headers ?? {}),
		accept: 'application/json'
	};

	// Fail closed: a present-but-invalid scope cookie must never silently run
	// the call in the operator's home tenant.
	const scope = init.scoped === false ? { state: 'none' as const } : readOperatorScope(cookies);
	if (scope.state === 'invalid') {
		clearOperatorScope(cookies);
		throw redirect(303, '/operator/tenants');
	}
	if (scope.state === 'valid') headers['x-tenant-id'] = scope.scope.id;

	if (init.body && !headers['content-type']) {
		headers['content-type'] = 'application/json';
	}

	// Redirects are never followed (a 3xx reaches the caller as a non-2xx) and
	// the timeout bounds time-to-first-byte only.
	const send = async (token: string | undefined): Promise<Response> => {
		const timeout = upstreamTimeout(init.signal ?? undefined, config.UPSTREAM_TIMEOUT_MS);
		try {
			return await fetch(`${config.GO_API_URL}/api${path}`, {
				...init,
				redirect: 'manual',
				signal: timeout.signal,
				headers: token ? { ...headers, authorization: `Bearer ${token}` } : headers
			});
		} finally {
			// Headers in (or the call failed): stop the clock either way.
			timeout.headersReceived();
		}
	};

	const resp = await send(access);
	if (!access || !isAuthExpired(resp)) return resp;

	const renewed = await refreshSession(cookies);
	if (renewed) {
		await resp.body?.cancel();
		return send(renewed);
	}
	// Refresh token rejected (cookies cleared): the session is over.
	if (!cookies.get(REFRESH_COOKIE) && init.requireAuth !== false) {
		throw redirect(303, '/signin');
	}
	return resp;
}

/** Parse a Go JSON response. Returns `null` on 204 / empty bodies. */
export async function readGoJson<T>(resp: Response): Promise<T | null> {
	if (resp.status === 204) return null;
	const text = await resp.text();
	if (text.length === 0) return null;
	return JSON.parse(text) as T;
}

/**
 * Map a Go ProblemDetails-style error response to a typed shape.
 * Returns `{}` on unparseable bodies so callers can safely destructure.
 */
export interface GoErrorBody {
	type?: string;
	title?: string;
	status?: number;
	detail?: string;
	code?: string;
	message?: string;
	errors?: Record<string, string[] | undefined>;
}

export async function readGoError(resp: Response): Promise<GoErrorBody> {
	try {
		const text = await resp.text();
		if (text.length === 0) return {};
		return JSON.parse(text) as GoErrorBody;
	} catch {
		return {};
	}
}

/**
 * Map Go's `errors: { field: [msg] }` into a flat `{ field: msg }`
 * suitable for form action `fail(422, { errors })` responses.
 */
export function flattenGoErrors(body: GoErrorBody): Record<string, string> {
	const out: Record<string, string> = {};
	if (!body.errors) return out;
	for (const [k, v] of Object.entries(body.errors)) {
		const first = v?.[0];
		if (first) out[k] = first;
	}
	return out;
}
