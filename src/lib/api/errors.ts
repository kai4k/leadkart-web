import { codeCopy } from './code-copy.ts';
import {
	SCOPE_CHANGED_CODE,
	SCOPE_CHANGED_MESSAGE,
	SCOPE_EXPIRED_MESSAGE
} from './scope-header.ts';

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
/** The one line for "the session could not be renewed right now" (a 503 the caller may retry; never a sign-out). */
export const SESSION_RENEWAL_FAILED_MESSAGE = 'Session could not be renewed — try again';
export const SCOPE_INVALID_CODE = 'scope_invalid';
export const SCHEMA_MISMATCH_CODE = 'schema_mismatch';
export const CSRF_MISMATCH_CODE = 'csrf_mismatch';
/**
 * Go (authn/tenant_scope.go) answers these when the BFF-injected X-Tenant-Id is unusable: the
 * scope is dead, so the session guard exits it. The other tenant-scope codes are ordinary
 * request errors inside a valid scope (see fromResponse) and must NOT exit it.
 */
const GO_SCOPE_EXIT_CODES: ReadonlySet<string> = new Set([
	'invalid_tenant_scope',
	'tenant_scope_not_found'
]);
/** The generic "your input was refused" line: validation errors without field errors, `invalid_search_include`. */
const VALIDATION_FALLBACK_COPY = 'The request was not accepted. Check the values and try again.';
/**
 * The code → copy table is `code-copy.ts` (ONE table of i18n keys, shared with the server-action
 * failure helper). Raw Go text is technical or empty (enumeration safety), so it is NEVER shown: a
 * code that is not in the table gets the generic line for its status, and Go's text stays in the
 * error's `detail` for logs and support. None of the `tenant_scope_*` codes exits the operator scope
 * (the operator stays in context and must be told the truth).
 * Precedence is in `describeError`: a caller's own line for the status never replaces a code
 * in the table, except the plain `forbidden` (CALLER_LINE_WINS_CODES).
 */
/** Codes whose copy is the least specific one there is: the caller's own line for the status is better. */
const CALLER_LINE_WINS_CODES: ReadonlySet<string> = new Set([
	'forbidden',
	'invalid_search_include'
]);
export const FORBIDDEN_COPY = "You don't have permission to do this.";
const CONFLICT_COPY = 'This change conflicts with the current state. Refresh and try again.';
const FIELDS_COPY = 'Check the highlighted fields.';
const NOT_FOUND_COPY = 'This item no longer exists.';
const SIGN_IN_COPY = 'Sign in to continue.';
const REQUEST_FAILED_COPY = 'The request could not be completed. Please try again.';
const SERVER_ERROR_COPY = 'Something went wrong on our side. Please try again.';
/** 503/504 (the BFF's own: Go unreachable / too slow) and the BFF's 502 `upstream_unavailable`. */
export const UNREACHABLE_COPY =
	'The service is not reachable right now. Please try again in a moment.';
const MAX_RETRY_AFTER_SECONDS = 86_400;
const IMF_FIXDATE =
	/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;

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

/** Retry-After: delta-seconds or an HTTP-date (IMF-fixdate). Anything else is `undefined`; capped at 24 h. */
export function parseRetryAfter(value: string | null): number | undefined {
	const v = value?.trim();
	if (!v) return undefined;
	if (/^\d+$/.test(v)) return Math.min(Number(v), MAX_RETRY_AFTER_SECONDS);
	if (!IMF_FIXDATE.test(v)) return undefined;
	const at = Date.parse(v);
	if (Number.isNaN(at)) return undefined;
	return Math.min(Math.max(0, Math.ceil((at - Date.now()) / 1000)), MAX_RETRY_AFTER_SECONDS);
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

	static fromResponse(response: Response, rawBody: ApiErrorBody | null): ApiError {
		const body = typeof rawBody === 'object' && rawBody !== null ? rawBody : null;
		const code = firstText(body?.error);
		const text = firstText(body?.message, body?.detail);
		const traceId = response.headers.get(CORRELATION_ID_HEADER) ?? undefined;
		const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
		const copy = codeCopy(code);
		let err: ApiError;
		if (code !== undefined && GO_SCOPE_EXIT_CODES.has(code)) {
			err = new ScopeInvalidError(text, traceId, response.status);
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
				err = new AuthError(401, traceId, text);
				break;
			case 403:
				err = new AuthError(403, traceId, text);
				break;
			case 404:
				err = new NotFoundError(response.url || 'unknown resource', traceId, text);
				break;
			case 409:
				if (code === SCOPE_INVALID_CODE) err = new ScopeInvalidError(text, traceId);
				else if (code === SCOPE_CHANGED_CODE) err = new ScopeChangedError(text, traceId);
				else err = new ConflictError(copy, traceId, text);
				break;
			case 429:
				err = new RateLimitError(retryAfter, traceId);
				break;
			default:
				if (response.status >= 500) {
					err = new ServerError(response.status, body, traceId);
				} else {
					err = new ApiError(response.status, traceId);
					err.message = REQUEST_FAILED_COPY;
				}
		}
		if (code) err.code = code;
		// A 400 (tenant_scope_conflict, invalid_search_include) speaks the fixed copy too; Go's text
		// stays in `ValidationError.detail`.
		if (copy !== undefined) err.message = copy;
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
		this.message = Object.keys(fields).length > 0 ? FIELDS_COPY : VALIDATION_FALLBACK_COPY;
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

/** A download ran past its overall time cap (it kept sending, but never finished). Not the idle clock. */
export class DownloadTooLongError extends ApiError {
	constructor() {
		super(undefined, undefined);
		this.name = 'DownloadTooLongError';
		this.message = 'The download took too long and was stopped.';
	}
}

/** A download body grew past its byte cap and was stopped. */
export class DownloadTooLargeError extends ApiError {
	constructor() {
		super(undefined, undefined);
		this.name = 'DownloadTooLargeError';
		this.message = 'The download is too large and was stopped.';
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
		const code = (body as ApiErrorBody | null)?.error;
		this.message =
			status === 503 || status === 504 || code === 'upstream_unavailable'
				? UNREACHABLE_COPY
				: SERVER_ERROR_COPY;
	}
}

/** 401 or 403 — auth/authz failure. */
export class AuthError extends ApiError {
	declare readonly status: 401 | 403;

	/** Go's own text, for logs and support; never shown (`message` is fixed copy). */
	readonly detail: string | undefined;

	constructor(status: 401 | 403, traceId?: string, detail?: string) {
		super(status, traceId);
		this.name = 'AuthError';
		this.detail = detail;
		this.message = status === 401 ? SIGN_IN_COPY : FORBIDDEN_COPY;
	}
}

/** 404 — resource not found. `resource` (the request URL) is diagnostic only; never shown to users. */
export class NotFoundError extends ApiError {
	declare readonly status: 404;

	/** Go's own text, for logs and support; never shown. */
	readonly detail: string | undefined;

	constructor(
		public readonly resource: string,
		traceId?: string,
		detail?: string
	) {
		super(404, traceId);
		this.name = 'NotFoundError';
		this.detail = detail;
		this.message = NOT_FOUND_COPY;
	}
}

/** 409 — conflict (slug taken, duplicate record, etc.). */
export class ConflictError extends ApiError {
	declare readonly status: 409;
	/** Go's own text, for logs and support; never shown. `copy` is a code's allowlisted wording (the code table). */
	readonly detail: string | undefined;

	constructor(copy?: string, traceId?: string, detail?: string) {
		super(409, traceId);
		this.name = 'ConflictError';
		this.detail = detail;
		this.message = copy ?? CONFLICT_COPY;
	}
}

/**
 * The operator scope is dead: 409 `scope_invalid` from the BFF proxy, or Go's
 * `invalid_tenant_scope` (400) / `tenant_scope_not_found` (404). Not a domain conflict: the
 * session guard sends the operator back to /operator/tenants whatever the status.
 * `message` is the fixed user copy; Go's technical text (if any) is `detail`. `code` keeps the original code.
 */
export class ScopeInvalidError extends ApiError {
	declare readonly status: number;

	constructor(
		public readonly detail?: string,
		traceId?: string,
		status = 409
	) {
		super(status, traceId, SCOPE_INVALID_CODE);
		this.name = 'ScopeInvalidError';
		this.message = codeCopy(SCOPE_INVALID_CODE) ?? SCOPE_EXPIRED_MESSAGE;
	}
}

/**
 * 409 `scope_changed` from the BFF proxy: the page that made the call shows another tenant context
 * than the (shared) scope cookie now names, typically because another tab entered or left one. The
 * call never reached Go. The session guard re-runs the (app) layout so the page catches up; this is
 * not a failed action, and its copy says what is happening.
 */
export class ScopeChangedError extends ApiError {
	declare readonly status: 409;
	readonly detail: string | undefined;

	constructor(detail?: string, traceId?: string) {
		super(409, traceId, SCOPE_CHANGED_CODE);
		this.name = 'ScopeChangedError';
		this.detail = detail;
		this.message = codeCopy(SCOPE_CHANGED_CODE) ?? SCOPE_CHANGED_MESSAGE;
	}
}

export interface DescribeErrorOptions {
	/** Line for anything that is not an `ApiError` (a thrown string, a bug). Default "Something went wrong". */
	fallback?: string;
	/**
	 * The caller's own line per status ("You don't have permission to suspend tenants."). It replaces
	 * the generic line for its status, never a known-code copy (tenant-context refusals).
	 */
	status?: { 400?: string; 401?: string; 403?: string; 404?: string; 409?: string; 422?: string };
}

type OwnLineStatus = 400 | 401 | 403 | 404 | 409 | 422;

/**
 * The one user-facing line for any failure: toasts, inline banners, list errors.
 * Precedence, first match wins:
 *   1. not an ApiError → `fallback`
 *   2. a code in the code table → its fixed copy, EXCEPT plain `forbidden`, which the caller's own
 *      line for the status replaces (it is more specific). So a caller's 403 line never beats a
 *      `tenant_scope_*` code, `grant_exceeds_authority` or `self_modification_forbidden`.
 *   3. a dead operator scope / an error without status → its own message
 *   4. a validation error: with field errors "Check the highlighted fields." (the fields reach the form);
 *      without, the caller's 400/422 line, else the generic "request was not accepted" line
 *   5. the caller's own line for the status
 *   6. the error's own message (fixed copy; Go's text is never one: it lives in `detail`)
 */
/**
 * A failure that may pass on its own (network, timeout, 5xx, 429): the answer the user already has
 * may still be right. Any other failure (403, 404, 409, 4xx, a session or scope refusal) is an
 * ANSWER about the record or the access: what was shown before is not to be trusted.
 */
export function isTransientError(err: unknown): boolean {
	return (
		err instanceof NetworkError ||
		err instanceof TimeoutError ||
		err instanceof ServerError ||
		err instanceof RateLimitError
	);
}

export function describeError(err: unknown, options?: DescribeErrorOptions): string {
	// A caller that passes its own lines is a form or a dialog with fields on screen. A caller that passes nothing (the
	// global mutation toast, a bulk summary) has no form: "Check the highlighted fields." would point at nothing there.
	const formOnScreen = options !== undefined;
	const opts = options ?? {};
	if (!(err instanceof ApiError)) return opts.fallback ?? 'Something went wrong';
	const own = err.status === undefined ? undefined : opts.status?.[err.status as OwnLineStatus];
	const known = codeCopy(err.code);
	const callerLineWins = own !== undefined && CALLER_LINE_WINS_CODES.has(err.code ?? '');
	if (known !== undefined && !callerLineWins) return known;
	if (
		err instanceof ScopeInvalidError ||
		err instanceof ScopeChangedError ||
		err.status === undefined
	) {
		return err.message;
	}
	if (err instanceof ValidationError) {
		return err.hasFieldErrors && formOnScreen ? err.message : (own ?? VALIDATION_FALLBACK_COPY);
	}
	if (own === undefined) {
		return err.message;
	}
	return own;
}

/**
 * The failure of a "reason" dialog (suspend, deactivate, ...): a field error on
 * `reason` stays on the field; anything else is the one banner line from `describeError`.
 */
export function describeReasonError(
	err: unknown,
	opts: DescribeErrorOptions
): { reasonError: string | null; banner: string | null } {
	if (err instanceof ValidationError && err.fields.reason) {
		return { reasonError: err.fields.reason, banner: null };
	}
	return { reasonError: null, banner: describeError(err, opts) };
}

// ── Legacy compat ─────────────────────────────────────────────────────────

/** Type predicate — narrows `unknown` to `ApiError` safely. */
export function isApiError(value: unknown): value is ApiError {
	return value instanceof ApiError;
}

/** Sentinel codes used by client.ts (preserved for backward compat). */
export const TRANSPORT_ERROR = 'transport';
export const REFRESH_FAILED = 'auth.refresh_failed';
