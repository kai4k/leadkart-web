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
import { redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { config } from './config';
import { ACCESS_COOKIE } from './cookies';
import { getOperatorScope } from './scope';

export interface GoRequestInit extends Omit<RequestInit, 'headers'> {
	headers?: Record<string, string>;
	/** When true (default), throw redirect(303, '/signin') on missing access cookie. */
	requireAuth?: boolean;
}

/**
 * Call Go from a server-side context (load or action handler).
 *
 *   const resp = await goFetch(cookies, '/v1/users/abc', { method: 'GET' });
 *
 * The path MUST start with `/v1/` (the Go API root). Auth + scope
 * headers are injected automatically. The caller handles non-2xx
 * responses (this helper only handles the auth-cookie missing case).
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
	if (access) headers.authorization = `Bearer ${access}`;

	const scope = getOperatorScope(cookies);
	if (scope) headers['x-tenant-id'] = scope.id;

	if (init.body && !headers['content-type']) {
		headers['content-type'] = 'application/json';
	}

	return fetch(`${config.GO_API_URL}/api${path}`, { ...init, headers });
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
