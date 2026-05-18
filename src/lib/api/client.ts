/**
 * Cross-cutting fetch wrapper for the leadkart-go JSON API.
 *
 * Concerns owned here:
 *   - Base URL resolution via SvelteKit `$env/static/public`
 *   - Authorization header injection (Bearer JWT from auth hooks)
 *   - JSON encode/decode + content-type
 *   - Error normalisation → typed [ApiError]
 *   - 401 → silent refresh + single retry (RFC 6749 OAuth 2.0 token
 *     refresh — Auth0 / Okta / Stripe canon)
 *
 * Per-feature typed wrappers (login, listLeads, etc.) live in
 * lib/features/<x>/api.ts and call into this client.
 */

import { ApiError, isApiError, type ApiErrorBody } from './errors';

/**
 * Auth integration hooks — injected at runtime by the session store.
 * Keeps this module decoupled from feature/auth (avoids circular
 * dep + leaves the client testable with a fake hook set).
 */
export interface AuthHooks {
	/** Returns the current access token, or null if signed-out. */
	getAccessToken: () => string | null;
	/** Attempts to refresh the access token. Returns true on success. */
	refreshTokens: () => Promise<boolean>;
	/** Called when refresh fails — typically clears the session. */
	onUnauthorized: () => void;
}

let hooks: AuthHooks = {
	getAccessToken: () => null,
	refreshTokens: async () => false,
	onUnauthorized: () => {}
};

export function setAuthHooks(next: AuthHooks) {
	hooks = next;
}

function resolveBaseUrl(): string {
	// Dev: vite proxies /api/* → http://localhost:8080 (see vite.config).
	// Prod: when first deploy lands, switch this to a build-time inline
	// (e.g. Vite `define` in vite.config: `__API_BASE_URL__` replaced at
	// build time). Avoiding $env/* helpers — adapter-static + Vite has
	// a hash-mismatch bug with $env/dynamic/public that crashes chunk
	// init, and $env/static/public requires the var be declared at
	// build time (which CI lacks). Hardcoded relative path is the
	// simplest reliable primitive while there's no production deploy.
	return '/api';
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
	/** Serialised as JSON body if defined. */
	json?: unknown;
	/** Default true; set false for public endpoints (login, signup). */
	auth?: boolean;
	/** Internal flag — true on the post-refresh retry to prevent loops. */
	_retried?: boolean;
}

/**
 * Issues a typed JSON request.
 *
 * Resolves to the parsed JSON body on 2xx; rejects with [ApiError] on
 * non-2xx or transport failures. On 401 with auth=true, attempts a
 * silent refresh + ONE retry; if refresh fails, calls onUnauthorized
 * (typically session.clear) and rejects with REFRESH_FAILED.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { json, auth = true, headers, _retried = false, ...rest } = options;
	const url = resolveBaseUrl() + (path.startsWith('/') ? path : '/' + path);

	const finalHeaders = new Headers(headers);
	if (json !== undefined) {
		finalHeaders.set('Content-Type', 'application/json');
	}
	finalHeaders.set('Accept', 'application/json');
	if (auth) {
		const token = hooks.getAccessToken();
		if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
	}

	let response: Response;
	try {
		response = await fetch(url, {
			...rest,
			headers: finalHeaders,
			body: json !== undefined ? JSON.stringify(json) : undefined
		});
	} catch (cause) {
		throw ApiError.transport(cause);
	}

	// 401 path: try silent refresh once. Skip when auth=false (the
	// login / refresh endpoints themselves), or when we've already
	// retried (prevents infinite loops if refresh returns 401 too).
	if (response.status === 401 && auth && !_retried) {
		const refreshed = await hooks.refreshTokens();
		if (refreshed) {
			return request<T>(path, { ...options, _retried: true });
		}
		hooks.onUnauthorized();
		throw ApiError.refreshFailed();
	}

	const text = await response.text();
	const parsed: unknown = text.length > 0 ? safeJsonParse(text) : null;

	if (!response.ok) {
		throw ApiError.fromResponse(response, parsed as ApiErrorBody | null);
	}
	return parsed as T;
}

function safeJsonParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		// Non-JSON 2xx body (e.g. 204 No Content edge or text/plain).
		// Returning null is safer than the raw string — callers casting
		// to a typed shape would silently break with the string fallback.
		return null;
	}
}

export const api = {
	get: <T>(path: string, options?: RequestOptions) =>
		request<T>(path, { ...options, method: 'GET' }),
	post: <T>(path: string, json?: unknown, options?: RequestOptions) =>
		request<T>(path, { ...options, method: 'POST', json }),
	put: <T>(path: string, json?: unknown, options?: RequestOptions) =>
		request<T>(path, { ...options, method: 'PUT', json }),
	patch: <T>(path: string, json?: unknown, options?: RequestOptions) =>
		request<T>(path, { ...options, method: 'PATCH', json }),
	delete: <T>(path: string, json?: unknown, options?: RequestOptions) =>
		request<T>(path, { ...options, method: 'DELETE', json })
};

export { isApiError };
