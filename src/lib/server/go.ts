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
import { error, redirect, type Cookies } from '@sveltejs/kit';
import {
	flattenFieldErrors,
	SESSION_RENEWAL_FAILED_MESSAGE,
	type ApiErrorBody
} from '../api/errors.ts';
import { isAuthExpired, refreshSession } from './auth-refresh.ts';
import { config } from './config.ts';
import { currentClientAddress, FORWARDED_FOR_HEADER } from './client-address.ts';
import { ACCESS_COOKIE, REFRESH_COOKIE, sessionRenewalPending } from './cookies.ts';
import { upstreamTimeout } from './proxy.ts';
import { clearOperatorScope, readOperatorScope } from './scope.ts';

/**
 * The only headers a caller of `goFetch` may choose. Everything else on the outgoing request is set
 * here from what the BFF knows (authorization from the access cookie, the tenant scope, the client
 * address): an allowlist, so a header the browser influenced (authorization, x-tenant-id, cookie,
 * forwarding headers, a command id, anything not yet invented) can never reach Go through a caller.
 */
const CALLER_HEADERS: ReadonlySet<string> = new Set(['content-type', 'accept']);

export interface GoRequestInit extends Omit<RequestInit, 'headers' | 'body'> {
	headers?: Record<string, string>;
	/** String only: the request is replayed after a refresh, so a stream body is not allowed. */
	body?: string;
	/** When true (default): no access cookie → redirect(303, '/signin'), or 503 when a refresh cookie is still there (the refresh could not reach Go). */
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
	if (!access && init.requireAuth !== false) {
		// The hook refreshes an expired access cookie before any action runs. A refresh cookie that is
		// STILL here means that refresh could not reach Go (a rejected one clears it), so the session
		// is not over: 503 keeps the user's form, /signin would throw it away.
		if (sessionRenewalPending(cookies)) throw error(503, SESSION_RENEWAL_FAILED_MESSAGE);
		throw redirect(303, '/signin');
	}

	const headers: Record<string, string> = { accept: 'application/json' };
	for (const [name, value] of Object.entries(init.headers ?? {})) {
		if (CALLER_HEADERS.has(name.toLowerCase())) headers[name.toLowerCase()] = value;
	}

	// Where the call came from is the BFF's to say (see client-address.ts): the one address of the
	// request being served.
	const address = currentClientAddress();
	if (address !== undefined) headers[FORWARDED_FOR_HEADER] = address;

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
			// An explicit set of fields, never `...init`: nothing a caller adds to the init reaches fetch.
			return await fetch(`${config.GO_API_URL}/api${path}`, {
				method: init.method,
				body: init.body,
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
	if (renewed.ok) {
		await resp.body?.cancel();
		return send(renewed.access);
	}
	if (renewed.reason === 'unavailable') {
		// The session is fine, Go is not: callers must not read this 401 as "signed out".
		await resp.body?.cancel();
		throw error(503, SESSION_RENEWAL_FAILED_MESSAGE);
	}
	// Refresh token rejected (cookies cleared): the session is over.
	if (!cookies.get(REFRESH_COOKIE) && init.requireAuth !== false) {
		throw redirect(303, '/signin');
	}
	return resp;
}

// The pre-login / refresh call lives in proxy.ts (auth-refresh.ts cannot import this module: cycle).
export { goAuthFetch } from './proxy.ts';

/**
 * Status to report for a non-2xx Go response via `error()` / `fail()`.
 * goFetch never follows redirects, so a 3xx reaches callers; Kit accepts only
 * 4xx/5xx there, and a Go redirect is a bad gateway answer anyway: 502.
 */
export function goErrorStatus(resp: Response): number {
	return resp.status >= 400 ? resp.status : 502;
}

/** Parse a Go JSON response. Returns `null` on 204 / empty bodies. */
export async function readGoJson<T>(resp: Response): Promise<T | null> {
	if (resp.status === 204) return null;
	const text = await resp.text();
	if (text.length === 0) return null;
	return JSON.parse(text) as T;
}

/**
 * Go's error envelope (`error` is the code; `errors` the field map). One type
 * for the browser client and the server actions: see `ApiErrorBody`.
 */
export type GoErrorBody = ApiErrorBody;

/** Returns `{}` on empty or unparseable bodies so callers can safely destructure. */
export async function readGoError(resp: Response): Promise<GoErrorBody> {
	try {
		const text = await resp.text();
		if (text.length === 0) return {};
		const parsed: unknown = JSON.parse(text);
		return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
			? (parsed as GoErrorBody)
			: {};
	} catch {
		return {};
	}
}

/**
 * A failed Go answer as an action's `fail()` input: the status and Go's per-field messages (for the
 * form fields). Go's own banner text never leaves here; the banner is the status class's i18n key
 * (`failFromGo`).
 */
export async function readGoFailure(
	resp: Response
): Promise<{ status: number; fields: Record<string, string>; code: string | undefined }> {
	const body = await readGoError(resp);
	const code = typeof body.error === 'string' && body.error !== '' ? body.error : undefined;
	return { status: goErrorStatus(resp), fields: flattenGoErrors(body), code };
}

/** Go's `errors: { field: [msg] }` as a flat `{ field: msg }` for `fail(422, { errors })`. */
export function flattenGoErrors(body: GoErrorBody): Record<string, string> {
	return flattenFieldErrors(body.errors);
}
