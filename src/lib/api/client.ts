/**
 * Browser → BFF (/api/*) client. The BFF proxy adds the Bearer token and X-Tenant-Id.
 * Two call styles, because Go mutations answer 204 or an id-only 201/200 (backend-checklist #9):
 *   api.post(path, body)                 → void (any 2xx)
 *   api.postJson(path, body, schema)     → parsed body (only when the caller needs the id)
 * Paths are literals; query params go in opts.query.
 * ONE transport (`send`) serves both `api` and the deprecated `apiLegacy`.
 */
import type { z } from 'zod';
import { ApiError, isApiError, SchemaError, type ApiErrorBody } from './errors.ts';
import { getCsrfToken } from './csrf.ts';
import { isOperatorScopePath, SCOPE_REQUIRED_HEADER } from './scope-header.ts';

export const DEFAULT_TIMEOUT_MS = 15_000;
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

export function buildQueryString(query?: QueryParams): string {
	if (!query) return '';
	const qs = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null || value === '') continue;
		if (Array.isArray(value)) {
			for (const v of value) if (v !== '') qs.append(key, String(v));
		} else {
			qs.set(key, String(value));
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
	opts: RequestOptions = {}
): Promise<unknown> {
	const headers = new Headers(opts.headers);
	headers.set('Accept', 'application/json');
	if (body !== undefined) headers.set('Content-Type', 'application/json');
	// Tells the BFF this call needs the operator scope: it answers 409 scope_invalid
	// (instead of running in the home tenant) when the cookie is gone.
	if (typeof location !== 'undefined' && isOperatorScopePath(location.pathname))
		headers.set(SCOPE_REQUIRED_HEADER, '1');
	// CSRF double-submit: echo the lk_csrf cookie on mutations.
	if (method !== 'GET') {
		const csrf = getCsrfToken();
		if (csrf) headers.set('X-CSRF-Token', csrf);
	}
	const timeout = AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
	const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
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
		throw ApiError.transport(cause);
	}
	const data = text.length > 0 ? safeJsonParse(text) : undefined;
	if (!response.ok) throw ApiError.fromResponse(response, (data ?? null) as ApiErrorBody | null);
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
		parseWith(schema, await send(method, path, body, opts), `${method} ${path}`);

export const api = {
	get: async <S extends z.ZodType>(
		path: string,
		schema: S,
		opts?: RequestOptions
	): Promise<z.output<S>> =>
		parseWith(schema, await send('GET', path, undefined, opts), `GET ${path}`),
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
