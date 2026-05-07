/**
 * Cross-cutting fetch wrapper for the leadkart-go JSON API.
 *
 * Concerns owned here:
 *   - Base URL resolution (env override + dev-proxy fallback)
 *   - Authorization header injection (Bearer JWT from session store)
 *   - JSON encode/decode + content-type
 *   - Error normalisation → typed [ApiError]
 *   - 401 → session-clear + redirect to /signin (handled by callers
 *     via the typed error; client is HTTP-layer only)
 *
 * Per-feature typed wrappers (login, getMe, listLeads, etc.) live in
 * lib/features/<x>/api.ts and call into this client.
 */

import { ApiError, type ApiErrorBody } from './errors';

/**
 * Base URL resolution order:
 *   1. PUBLIC_API_BASE_URL env var (deploy-time wiring)
 *   2. /api (dev — proxied to leadkart-go via vite.config.ts)
 */
function resolveBaseUrl(): string {
	const env = import.meta.env.PUBLIC_API_BASE_URL;
	if (typeof env === 'string' && env.length > 0) return env.replace(/\/$/, '');
	return '/api';
}

/**
 * Token getter is injected at runtime so the client doesn't import
 * the session store directly (avoids circular dep + keeps client
 * testable with a fake getter).
 */
let getToken: () => string | null = () => null;

export function setTokenGetter(fn: () => string | null) {
	getToken = fn;
}

export interface RequestOptions extends RequestInit {
	json?: unknown;
	auth?: boolean; // default true; set false for unauthenticated calls (login, signup)
}

/**
 * Issues a typed JSON request. Resolves to the parsed JSON body on
 * 2xx; rejects with [ApiError] on non-2xx or transport failures.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { json, auth = true, headers, body, ...rest } = options;
	const url = resolveBaseUrl() + (path.startsWith('/') ? path : '/' + path);

	const finalHeaders = new Headers(headers);
	if (json !== undefined) {
		finalHeaders.set('Content-Type', 'application/json');
	}
	finalHeaders.set('Accept', 'application/json');
	if (auth) {
		const token = getToken();
		if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
	}

	let response: Response;
	try {
		response = await fetch(url, {
			...rest,
			headers: finalHeaders,
			body: json !== undefined ? JSON.stringify(json) : body
		});
	} catch (err) {
		throw ApiError.transport(err);
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
		return text;
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
	delete: <T>(path: string, options?: RequestOptions) =>
		request<T>(path, { ...options, method: 'DELETE' })
};
