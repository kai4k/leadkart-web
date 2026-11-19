/**
 * Typed API errors. Two JSON envelopes reach the browser:
 *   Go (relayed by the BFF proxy): { type?, title?, status?, detail?, error: <code>, message?, errors?: { field: string[] } }
 *     (identity/ports/http.go writeError; crm|orders|inventory|dispatch errorResponse). `message`/`detail`
 *     are often empty (enumeration safety). Field errors use `errors`.
 *   BFF (lib/server/http.ts jsonError): { error: <code>, message }.
 * Go never sends `code`, `fields` or `trace_id`; the correlation id is the X-Correlation-ID header.
 */
export interface ApiErrorBody {
	error?: string;
	message?: string;
	detail?: string;
	title?: string;
	type?: string;
	status?: number;
	errors?: Record<string, readonly string[] | undefined>;
}

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const SESSION_EXPIRED_CODE = 'session_expired';
export const SCOPE_INVALID_CODE = 'scope_invalid';
export const SCHEMA_MISMATCH_CODE = 'schema_mismatch';

function firstText(...values: Array<string | undefined>): string | undefined {
	for (const v of values) if (typeof v === 'string' && v.trim() !== '') return v.trim();
	return undefined;
}

export function flattenFieldErrors(errors: ApiErrorBody['errors']): Record<string, string> {
	const out: Record<string, string> = {};
	if (!errors) return out;
	for (const [field, messages] of Object.entries(errors)) {
		const first = messages?.find((m) => m.trim() !== '');
		if (first) out[field] = first;
	}
	return out;
}

export function parseRetryAfter(value: string | null): number | undefined {
	if (!value) return undefined;
	const seconds = Number(value);
	if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
	const at = Date.parse(value);
	return Number.isNaN(at) ? undefined : Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

export class ApiError extends Error {
	readonly status: number | undefined;
	readonly traceId: string | undefined;
	code: string | undefined;

	constructor(status?: number, traceId?: string, code?: string) {
		super('An unexpected error occurred.');
		this.name = 'ApiError';
		this.status = status;
		this.traceId = traceId;
		this.code = code;
	}

	static fromResponse(response: Response, body: ApiErrorBody | null): ApiError {
		const code = firstText(body?.error);
		const text = firstText(body?.message, body?.detail);
		const traceId = response.headers.get(CORRELATION_ID_HEADER) ?? undefined;
		let err: ApiError;
		switch (response.status) {
			case 400:
			case 422:
				err = new ValidationError(flattenFieldErrors(body?.errors), response.status, text, traceId);
				break;
			case 401:
				err = new AuthError(401, traceId);
				break;
			case 403:
				err = new AuthError(403, traceId, text);
				break;
			case 404:
				err = new NotFoundError(response.url || 'unknown resource', traceId);
				break;
			case 409:
				err =
					code === SCOPE_INVALID_CODE
						? new ScopeInvalidError(
								text ?? 'Operator scope expired — select the tenant again',
								traceId
							)
						: new ConflictError(
								text ?? 'This conflicts with the current state. Refresh and try again.',
								traceId
							);
				break;
			case 429:
				err = new RateLimitError(parseRetryAfter(response.headers.get('retry-after')), traceId);
				break;
			default:
				if (response.status >= 500) {
					err = new ServerError(response.status, body, traceId);
				} else {
					err = new ApiError(response.status, traceId);
					err.message = text ?? firstText(body?.title) ?? (response.statusText || 'Request failed');
				}
		}
		if (code) err.code = code;
		return err;
	}

	/** fetch() threw. Caller aborts never get here (the client rethrows them). */
	static transport(cause: unknown): NetworkError | TimeoutError {
		if (cause instanceof DOMException && cause.name === 'TimeoutError') return new TimeoutError();
		return new NetworkError(cause);
	}

	static refreshFailed(): AuthError {
		const err = new AuthError(401);
		err.message = 'Session expired. Please sign in again.';
		return err;
	}
}

export class ValidationError extends ApiError {
	declare readonly status: 400 | 422;
	readonly fields: Record<string, string>;
	readonly detail: string | undefined;
	constructor(
		fields: Record<string, string>,
		status: 400 | 422,
		detail?: string,
		traceId?: string
	) {
		super(status, traceId);
		this.name = 'ValidationError';
		this.fields = fields;
		this.detail = detail;
		this.message =
			detail ?? Object.values(fields)[0] ?? 'Some details are not valid. Check them and try again.';
	}
	get hasFieldErrors(): boolean {
		return Object.keys(this.fields).length > 0;
	}
}

export interface SchemaIssue {
	path: string;
	message: string;
}

/** The response did not match the schema the web derives from the Go spec. */
export class SchemaError extends ApiError {
	readonly endpoint: string;
	readonly issues: readonly SchemaIssue[];
	constructor(
		endpoint: string,
		issues: readonly SchemaIssue[],
		opts?: { message?: string /* overrides the generic copy */ }
	) {
		super(undefined, undefined, SCHEMA_MISMATCH_CODE);
		this.name = 'SchemaError';
		this.endpoint = endpoint;
		this.issues = issues;
		this.message =
			opts?.message ??
			'The server sent data this page does not understand. Refresh the page; if it keeps happening, contact support.';
	}
}

export class RateLimitError extends ApiError {
	declare readonly status: 429;
	readonly retryAfterSeconds: number | undefined;
	constructor(retryAfterSeconds?: number, traceId?: string) {
		super(429, traceId);
		this.name = 'RateLimitError';
		this.retryAfterSeconds = retryAfterSeconds;
		this.message =
			retryAfterSeconds !== undefined
				? `Too many requests. Try again in ${retryAfterSeconds} seconds.`
				: 'Too many requests. Wait a moment and try again.';
	}
}

/** Socket hangup, offline, DNS failure, CORS block — `fetch()` threw `TypeError`. */
export class NetworkError extends ApiError {
	constructor(public readonly cause: unknown) {
		super(undefined, undefined);
		this.name = 'NetworkError';
		this.message = 'Connection problem — check your network and try again.';
	}
}

/** AbortController fired before the server responded. */
export class TimeoutError extends ApiError {
	constructor() {
		super(undefined, undefined);
		this.name = 'TimeoutError';
		this.message = 'Request timed out. The server may be slow — try again.';
	}
}

/** 5xx response — server-side fault, retryable. */
export class ServerError extends ApiError {
	declare readonly status: number;

	constructor(
		status: number,
		public readonly body: unknown,
		traceId?: string
	) {
		super(status, traceId);
		this.name = 'ServerError';
		this.message = 'Server error — our team has been notified. Please try again.';
	}
}

/** 401 or 403 — auth/authz failure. */
export class AuthError extends ApiError {
	declare readonly status: 401 | 403;

	/** `detail` is Go's own 403 text (forbidden, self_modification_forbidden, grant_exceeds_authority); 401 stays generic. */
	constructor(status: 401 | 403, traceId?: string, detail?: string) {
		super(status, traceId);
		this.name = 'AuthError';
		this.message =
			status === 401
				? 'Sign in to continue.'
				: (detail ?? "You don't have permission for this action.");
	}
}

/** 404 — resource not found. */
export class NotFoundError extends ApiError {
	declare readonly status: 404;

	constructor(
		public readonly resource: string,
		traceId?: string
	) {
		super(404, traceId);
		this.name = 'NotFoundError';
		this.message = `${resource} not found.`;
	}
}

/** 409 — conflict (slug taken, duplicate record, etc.). */
export class ConflictError extends ApiError {
	declare readonly status: 409;

	constructor(
		public readonly detail: string,
		traceId?: string
	) {
		super(409, traceId);
		this.name = 'ConflictError';
		this.message = detail;
	}
}

/**
 * 409 `scope_invalid` — raised by the BFF proxy, never by Go. Not a domain
 * conflict: the global handler sends the operator back to /operator/tenants.
 */
export class ScopeInvalidError extends ApiError {
	declare readonly status: 409;

	constructor(
		public readonly detail: string,
		traceId?: string
	) {
		super(409, traceId, SCOPE_INVALID_CODE);
		this.name = 'ScopeInvalidError';
		this.message = detail;
	}
}

// ── Legacy compat ─────────────────────────────────────────────────────────

/** Type predicate — narrows `unknown` to `ApiError` safely. */
export function isApiError(value: unknown): value is ApiError {
	return value instanceof ApiError;
}

/** Sentinel codes used by client.ts (preserved for backward compat). */
export const TRANSPORT_ERROR = 'transport';
export const REFRESH_FAILED = 'auth.refresh_failed';
