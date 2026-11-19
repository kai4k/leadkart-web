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
export const CSRF_MISMATCH_CODE = 'csrf_mismatch';
/** Go (authn/tenant_scope.go) answers these when the BFF-injected X-Tenant-Id is unusable. */
const GO_SCOPE_CODES: ReadonlySet<string> = new Set([
	'invalid_tenant_scope',
	'tenant_scope_not_found',
	'tenant_scope_conflict',
	'tenant_scope_not_supported'
]);
/** A suspended/deleted tenant: a scope problem only when the request was scope-marked. */
const TENANT_NOT_ACTIVE_CODE = 'tenant_not_active';
const SCOPE_EXPIRED_COPY = 'Operator scope expired — select the tenant again';

function firstText(...values: Array<string | undefined>): string | undefined {
	for (const v of values) if (typeof v === 'string' && v.trim() !== '') return v.trim();
	return undefined;
}

/** First non-blank message per field. Malformed input (non-object, non-array values, non-string entries) is ignored. */
export function flattenFieldErrors(errors: unknown): Record<string, string> {
	const out: Record<string, string> = {};
	if (typeof errors !== 'object' || errors === null || Array.isArray(errors)) return out;
	for (const [field, messages] of Object.entries(errors)) {
		if (!Array.isArray(messages)) continue;
		const first = messages.find((m): m is string => typeof m === 'string' && m.trim() !== '');
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
	/** Seconds from `Retry-After` (429 rate limit, 423 account_locked, ...), any status. */
	retryAfterSeconds: number | undefined;

	constructor(status?: number, traceId?: string, code?: string) {
		super('An unexpected error occurred.');
		this.name = 'ApiError';
		this.status = status;
		this.traceId = traceId;
		this.code = code;
	}

	/** `ctx.scopeRequired`: the request carried the operator-scope marker header. */
	static fromResponse(
		response: Response,
		rawBody: ApiErrorBody | null,
		ctx: { scopeRequired?: boolean } = {}
	): ApiError {
		const body = typeof rawBody === 'object' && rawBody !== null ? rawBody : null;
		const code = firstText(body?.error);
		const text = firstText(body?.message, body?.detail);
		const traceId = response.headers.get(CORRELATION_ID_HEADER) ?? undefined;
		const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
		let err: ApiError;
		if (
			code !== undefined &&
			(GO_SCOPE_CODES.has(code) || (code === TENANT_NOT_ACTIVE_CODE && ctx.scopeRequired === true))
		) {
			err = new ScopeInvalidError(text ?? SCOPE_EXPIRED_COPY, traceId, response.status);
			err.code = code;
			err.retryAfterSeconds = retryAfter;
			return err;
		}
		switch (response.status) {
			case 400:
			case 422:
				err = new ValidationError(flattenFieldErrors(body?.errors), response.status, text, traceId);
				break;
			case 401:
				// session_expired (BFF) stays generic; other 401s (incorrect_current_password, ...) speak for themselves.
				err = new AuthError(401, traceId, code === SESSION_EXPIRED_CODE ? undefined : text);
				break;
			case 403:
				err = new AuthError(
					403,
					traceId,
					code === CSRF_MISMATCH_CODE
						? 'Your session token is out of date — reload the page and try again.'
						: text
				);
				break;
			case 404:
				err = new NotFoundError(response.url || 'unknown resource', traceId, text);
				break;
			case 409:
				err =
					code === SCOPE_INVALID_CODE
						? new ScopeInvalidError(text ?? SCOPE_EXPIRED_COPY, traceId)
						: new ConflictError(text, traceId);
				break;
			case 429:
				err = new RateLimitError(retryAfter, traceId);
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
		err.retryAfterSeconds ??= retryAfter;
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

	/** `detail` is Go's own text (403: forbidden, self_modification_forbidden, ...; 401 other than session_expired: incorrect_current_password, ...). */
	constructor(status: 401 | 403, traceId?: string, detail?: string) {
		super(status, traceId);
		this.name = 'AuthError';
		this.message =
			detail ??
			(status === 401 ? 'Sign in to continue.' : "You don't have permission for this action.");
	}
}

/** 404 — resource not found. `resource` (the request URL) is diagnostic only; never shown to users. */
export class NotFoundError extends ApiError {
	declare readonly status: 404;

	constructor(
		public readonly resource: string,
		traceId?: string,
		text?: string
	) {
		super(404, traceId);
		this.name = 'NotFoundError';
		this.message = text ?? 'This item no longer exists.';
	}
}

/** 409 — conflict (slug taken, duplicate record, etc.). */
export class ConflictError extends ApiError {
	declare readonly status: 409;
	/** Go's text; undefined when Go sent none, so callers' `err.detail || '<specific copy>'` fallbacks work. */
	readonly detail: string | undefined;

	constructor(detail?: string, traceId?: string) {
		super(409, traceId);
		this.name = 'ConflictError';
		this.detail = detail;
		this.message = detail ?? 'This conflicts with the current state. Refresh and try again.';
	}
}

/**
 * The operator scope is unusable: 409 `scope_invalid` from the BFF proxy, or one of Go's
 * tenant-scope codes (400/403/404, see GO_SCOPE_CODES). Not a domain conflict: the
 * session guard sends the operator back to /operator/tenants whatever the status.
 * `code` keeps the original code.
 */
export class ScopeInvalidError extends ApiError {
	declare readonly status: number;

	constructor(
		public readonly detail: string,
		traceId?: string,
		status = 409
	) {
		super(status, traceId, SCOPE_INVALID_CODE);
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
