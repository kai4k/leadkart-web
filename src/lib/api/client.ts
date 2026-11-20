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
import { page } from '$app/state';
import { refreshCapabilities } from './capabilities-refresh.ts';
import { SCOPE_CONTEXT_HEADER, SESSION_RENEWED_HEADER } from './scope-header.ts';

/**
 * A download's body may take as long as it needs, but not stand still: no chunk for this long and it
 * is cancelled (a stalled export would otherwise hold the connection and the button for ever).
 */
export const DOWNLOAD_IDLE_TIMEOUT_MS = 30_000;

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

/**
 * The body of a download as a Blob, chunk by chunk: an idle clock restarts with every chunk and
 * aborts the read (and cancels the stream) when nothing arrives for `idleMs` (never when it is not
 * finite); `signal` (the caller's, plus the deadline while it still runs) cancels it at once. Rejects with `TimeoutError` / the signal's reason.
 */
async function readBlobBody(
	response: Response,
	idleMs: number,
	signal: AbortSignal | undefined
): Promise<Blob> {
	if (!response.body) return response.blob();
	const reader = response.body.getReader();
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	let idle: ReturnType<typeof setTimeout> | undefined;
	let stop: (() => void) | undefined;
	const gone = new Promise<never>((_, reject) => {
		const onAbort = () => reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
		if (signal?.aborted) onAbort();
		else signal?.addEventListener('abort', onAbort, { once: true });
		stop = () => signal?.removeEventListener('abort', onAbort);
	});
	gone.catch(() => {});
	try {
		for (;;) {
			const next = await Promise.race([
				reader.read(),
				...(Number.isFinite(idleMs)
					? [
							new Promise<never>((_, reject) => {
								idle = setTimeout(() => reject(new TimeoutError()), idleMs);
							})
						]
					: []),
				gone
			]);
			clearTimeout(idle);
			if (next.done) break;
			chunks.push(next.value as Uint8Array<ArrayBuffer>);
		}
		return new Blob(chunks);
	} catch (cause) {
		await reader.cancel(cause).catch(() => {});
		throw cause;
	} finally {
		clearTimeout(idle);
		stop?.();
	}
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
	expectJson = false,
	asBlob = false
): Promise<unknown> {
	const headers = new Headers(opts.headers);
	headers.set('Accept', asBlob ? '*/*' : 'application/json');
	// A form goes out untouched: the browser writes the multipart content type with its boundary.
	const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
	if (body !== undefined && !isForm) headers.set('Content-Type', 'application/json');
	// The context this page shows. The BFF compares it with the scope cookie (shared by every tab)
	// and answers 409 scope_changed instead of running the call in another tenant.
	headers.delete(SCOPE_CONTEXT_HEADER);
	// Read from the data the page has COMMITTED, at send time: a load (a preload runs it without any
	// navigation following) never moves it, only a committed navigation or invalidation does.
	const context = (page.data as { scopeContext?: unknown } | undefined)?.scopeContext;
	if (typeof context === 'string') headers.set(SCOPE_CONTEXT_HEADER, context);
	// CSRF double-submit: echo the lk_csrf cookie on mutations.
	if (method !== 'GET') {
		const csrf = getCsrfToken();
		if (csrf) headers.set('X-CSRF-Token', csrf);
	}
	const { signal, timedOut, stopTimer, dispose } = requestSignal(
		opts.signal,
		opts.timeoutMs ?? (method === 'GET' ? DEFAULT_TIMEOUT_MS : undefined)
	);
	let response: Response;
	let text = '';
	let blob: Blob | undefined;
	try {
		response = await fetch(
			`/api${path.startsWith('/') ? path : `/${path}`}${buildQueryString(opts.query)}`,
			{
				method,
				headers,
				credentials: 'same-origin',
				body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
				signal
			}
		);
		// A download's deadline covers the HEADERS only: a large export streams for as long as it needs
		// (the caller's own signal still cancels it, and a body that stands still for
		// DOWNLOAD_IDLE_TIMEOUT_MS is cancelled), where the read budget would cut a slow body. An ERROR
		// answer is a small JSON body: it is read under the normal deadline.
		if (asBlob && response.ok) {
			stopTimer();
			blob = await readBlobBody(response, DOWNLOAD_IDLE_TIMEOUT_MS, signal);
		} else if (asBlob) {
			text = await (await readBlobBody(response, Number.POSITIVE_INFINITY, signal)).text();
		} else text = await response.text();
	} catch (cause) {
		if (opts.signal?.aborted) throw opts.signal.reason ?? cause;
		if (cause instanceof TimeoutError) throw cause;
		// The deadline's own signal decides, not the rejection reason (a stalled body read may reject with anything).
		if (timedOut()) throw new TimeoutError();
		throw ApiError.transport(cause);
	} finally {
		dispose();
	}
	// The BFF renewed the session for this call: the caller's permissions may be new.
	if (response.headers.has(SESSION_RENEWED_HEADER)) void refreshCapabilities();
	if (blob !== undefined) return blob;
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
	/** Multipart upload (a `FormData`) through the same transport: CSRF, context fingerprint, error mapping. */
	postForm: async <S extends z.ZodType>(
		path: string,
		form: FormData,
		schema: S,
		opts?: RequestOptions
	): Promise<z.output<S>> =>
		parseWith(schema, await send('POST', path, form, opts, true), `POST ${path}`),
	/**
	 * A download as a `Blob` (CSV export): a plain link cannot carry the context header, this can. The
	 * caller names the type it expects and the Blob carries THAT, never whatever the response said
	 * (the bytes are only ever offered to the user as a file, not interpreted as a page). The deadline
	 * bounds the headers, not the body.
	 */
	getBlob: async (path: string, type: string, opts?: RequestOptions): Promise<Blob> => {
		const received = (await send('GET', path, undefined, opts, false, true)) as Blob;
		return new Blob([received], { type });
	},
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
