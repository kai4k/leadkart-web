/**
 * Cross-cutting fetch wrapper for the leadkart-go JSON API.
 *
 * BFF model: browser never injects Authorization headers. The SvelteKit
 * Node proxy (routes/api/[...path]/+server.ts) reads the httpOnly
 * __Host-lk_access cookie and adds Bearer on the server side. This
 * client only needs to:
 *   - Route to /api/* (the BFF proxy path)
 *   - Inject X-CSRF-Token on mutating methods (double-submit-cookie pattern)
 *   - Inject X-Tenant-Id when caller opts in (operator scope override)
 *   - Normalise errors → typed [ApiError]
 *
 * 401 handling: if the BFF proxy's refresh loop failed (token truly expired
 * and refresh exhausted), the proxy returns 401 to the browser. The error
 * is surfaced to the caller via ApiError.fromResponse — typically the
 * session store's logout() is called which redirects to /signin.
 *
 * Per-feature typed wrappers (login, listLeads, etc.) live in
 * lib/features/<x>/api.ts and call into this client.
 */

import { ApiError, isApiError, type ApiErrorBody } from './errors';
import { getCsrfToken } from './csrf';
import { z } from 'zod';

function resolveBaseUrl(): string {
	// All API calls go through the BFF proxy at /api/*.
	// The proxy adds the Bearer header server-side from the httpOnly cookie.
	return '/api';
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
	/** Serialised as JSON body if defined. */
	json?: unknown;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Issues a typed JSON request through the BFF proxy.
 *
 * Resolves to the parsed JSON body on 2xx; rejects with [ApiError] on
 * non-2xx or transport failures. 401 means the BFF's refresh loop has
 * already failed — surface directly to the caller.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { json, headers, ...rest } = options;
	const url = `${resolveBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

	const finalHeaders = new Headers(headers);
	if (json !== undefined) {
		finalHeaders.set('Content-Type', 'application/json');
	}
	finalHeaders.set('Accept', 'application/json');

	// CSRF: read the non-httpOnly lk_csrf cookie and echo as header
	// on mutations so the BFF proxy can validate the double-submit.
	const method = (rest.method ?? 'GET').toUpperCase();
	if (MUTATING.has(method)) {
		const csrf = getCsrfToken();
		if (csrf) finalHeaders.set('X-CSRF-Token', csrf);
	}

	let response: Response;
	try {
		response = await fetch(url, {
			...rest,
			method,
			headers: finalHeaders,
			credentials: 'same-origin', // send cookies; never cross-origin
			body: json !== undefined ? JSON.stringify(json) : undefined
		});
	} catch (cause) {
		throw ApiError.transport(cause);
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

/**
 * Parse a raw API response through a Zod schema.
 *
 * On success: returns the validated, typed result.
 * On ZodError: throws a user-facing Error with a clear reload message,
 *   but preserves the original `zodIssues` array on the error object so
 *   devtools-savvy engineers can inspect the exact path mismatch.
 */
export function parseResponse<S extends z.ZodTypeAny>(schema: S, raw: unknown): z.output<S> {
	try {
		return schema.parse(raw);
	} catch (err) {
		if (err instanceof z.ZodError) {
			const fields = err.issues.map((i) => i.path.join('.')).join(', ');
			const message = `Server response shape unexpected at: ${fields}. This is likely a backend deploy mismatch — please refresh.`;
			const wrapped = new Error(message);
			(wrapped as Error & { zodIssues: z.ZodIssue[] }).zodIssues = err.issues;
			throw wrapped;
		}
		throw err;
	}
}
