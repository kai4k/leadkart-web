/**
 * Browser → BFF (/api/*) client. The BFF proxy adds the Bearer token and X-Tenant-Id.
 * Two call styles, because Go mutations answer 204 or an id-only 201/200 (backend-checklist #9):
 *   api.post(path, body)                 → void (any 2xx)
 *   api.postJson(path, body, schema)     → parsed body (only when the caller needs the id)
 * Paths are literals; query params go in opts.query (arrays serialise as
 * repeated keys: `{ s: ['a','b'] }` -> `?s=a&s=b`; NaN/Infinity throw).
 * Timeouts: reads default to DEFAULT_TIMEOUT_MS, which MUST stay above 3 x the BFF's
 * UPSTREAM_TIMEOUT_MS (attempt -> refresh -> retry; see timeouts.ts). Mutations have NO
 * default client timeout (the BFF bounds them); `timeoutMs` overrides, 0/Infinity = none.
 * ONE transport (`send`) serves both `api` and the deprecated `apiLegacy`.
 */
import type { z } from 'zod';
import { ApiError, isApiError, SchemaError, TimeoutError, type ApiErrorBody } from './errors.ts';
import { requestSignal } from './abort.ts';
import { DEFAULT_READ_TIMEOUT_MS } from './timeouts.ts';
import { getCsrfToken } from './csrf.ts';
import { pageScopeContext } from './scope-context.ts';
import { refreshCapabilities } from './capabilities-refresh.ts';
import { SCOPE_CONTEXT_HEADER, SESSION_RENEWED_HEADER } from './scope-header.ts';

/** Default client timeout for reads. Must exceed 3 x the BFF upstream timeout; see timeouts.ts. */
export const DEFAULT_TIMEOUT_MS = DEFAULT_READ_TIMEOUT_MS;
export type QueryValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| readonly (string | number)[];
export type QueryParams = Readonly<Record<string, QueryValue>>;
export interface RequestOptions {
	query?: QueryParams;
	signal?: AbortSignal;
	timeoutMs?: number;
	headers?: Record<string, string>;
}
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function queryScalar(key: string, value: unknown): string {
	if (typeof value === 'number' && !Number.isFinite(value))
		throw new TypeError(`buildQueryString: non-finite number for "${key}" (${String(value)})`);
	return String(value);
}

/**
 * Query serialiser. An array value becomes REPEATED keys (`{ s: ['a','b'] }` -> `?s=a&s=b`), the
 * form Go's multi-value parameters read. An endpoint where Go expects ONE comma-separated value
 * (e.g. search `include=a,b`) must be joined by its gateway before it reaches here (the search
 * gateway passes `include` as a pre-joined string); never rely on this function to comma-join.
 */
export function buildQueryString(query?: QueryParams): string {
	if (!query) return '';
	const qs = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null || value === '') continue;
		if (Array.isArray(value)) {
			for (const v of value) if (v !== '') qs.append(key, queryScalar(key, v));
		} else {
			qs.set(key, queryScalar(key, value));
		}
	}
	const s = qs.toString();
	return s ? `?${s}` : '';
}

function safeJsonParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

async function send(
	method: Method,
	path: string,
	body: unknown,
	opts: RequestOptions = {},
	expectJson = false
): Promise<unknown> {
	const headers = new Headers(opts.headers);
	headers.set('Accept', 'application/json');
	if (body !== undefined) headers.set('Content-Type', 'application/json');
	// The context this page shows. The BFF compares it with the scope cookie (shared by every tab)
	// and answers 409 scope_changed instead of running the call in another tenant.
	headers.delete(SCOPE_CONTEXT_HEADER);
	const context = pageScopeContext.get();
	if (context !== undefined) headers.set(SCOPE_CONTEXT_HEADER, context);
	// CSRF double-submit: echo the lk_csrf cookie on mutations.
	if (method !== 'GET') {
		const csrf = getCsrfToken();
		if (csrf) headers.set('X-CSRF-Token', csrf);
	}
	const { signal, timedOut, dispose } = requestSignal(
		opts.signal,
		opts.timeoutMs ?? (method === 'GET' ? DEFAULT_TIMEOUT_MS : undefined)
	);
	let response: Response;
	let text: string;
	try {
		response = await fetch(
			`/api${path.startsWith('/') ? path : `/${path}`}${buildQueryString(opts.query)}`,
			{
				method,
				headers,
				credentials: 'same-origin',
				body: body === undefined ? undefined : JSON.stringify(body),
				signal
			}
		);
		text = await response.text();
	} catch (cause) {
		if (opts.signal?.aborted) throw opts.signal.reason ?? cause;
		// The deadline's own signal decides, not the rejection reason (a stalled body read may reject with anything).
		if (timedOut()) throw new TimeoutError();
		throw ApiError.transport(cause);
	} finally {
		dispose();
	}
	// The BFF renewed the session for this call: the caller's permissions may be new.
	if (response.headers.has(SESSION_RENEWED_HEADER)) void refreshCapabilities();
	const data = text.length > 0 ? safeJsonParse(text) : undefined;
	if (!response.ok) throw ApiError.fromResponse(response, (data ?? null) as ApiErrorBody | null);
	if (expectJson && data === undefined)
		throw new SchemaError(`${method} ${path}`, [], {
			message: `expected a JSON body, got ${response.status} with an empty/non-JSON body`
		});
	return data;
}

export function parseWith<S extends z.ZodType>(
	schema: S,
	data: unknown,
	endpoint: string
): z.output<S> {
	const result = schema.safeParse(data);
	if (result.success) return result.data;
	const issues = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
	if (import.meta.env.DEV)
		console.error('[api] response does not match the Go contract', endpoint, issues);
	throw new SchemaError(endpoint, issues);
}

const voidCall =
	(method: Method) =>
	async (path: string, body?: unknown, opts?: RequestOptions): Promise<void> => {
		await send(method, path, body, opts);
	};
const jsonCall =
	(method: Method) =>
	async <S extends z.ZodType>(
		path: string,
		body: unknown,
		schema: S,
		opts?: RequestOptions
	): Promise<z.output<S>> =>
		parseWith(schema, await send(method, path, body, opts, true), `${method} ${path}`);

export const api = {
	get: async <S extends z.ZodType>(
		path: string,
		schema: S,
		opts?: RequestOptions
	): Promise<z.output<S>> =>
		parseWith(schema, await send('GET', path, undefined, opts, true), `GET ${path}`),
	post: voidCall('POST'),
	put: voidCall('PUT'),
	patch: voidCall('PATCH'),
	delete: voidCall('DELETE'),
	postJson: jsonCall('POST'),
	putJson: jsonCall('PUT'),
	patchJson: jsonCall('PATCH'),
	deleteJson: jsonCall('DELETE')
};

/** @deprecated Old call style (parsed JSON or null) for gateways not yet re-contracted; deleted in Task 30. */
export const apiLegacy = {
	get: <T>(path: string) => send('GET', path, undefined).then((d) => (d ?? null) as T),
	post: <T>(path: string, json?: unknown) => send('POST', path, json).then((d) => (d ?? null) as T),
	put: <T>(path: string, json?: unknown) => send('PUT', path, json).then((d) => (d ?? null) as T),
	patch: <T>(path: string, json?: unknown) =>
		send('PATCH', path, json).then((d) => (d ?? null) as T),
	delete: <T>(path: string, json?: unknown) =>
		send('DELETE', path, json).then((d) => (d ?? null) as T)
};

/** @deprecated Use api.get/postJson with a schema; deleted in Task 30. */
export function parseResponse<S extends z.ZodType>(schema: S, raw: unknown): z.output<S> {
	return parseWith(schema, raw, 'legacy');
}

export { isApiError };
