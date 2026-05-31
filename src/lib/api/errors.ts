/**
 * Typed API error hierarchy — subclasses per HTTP/transport failure mode.
 *
 * Components pattern-match on `instanceof <Subclass>` for specific UX:
 *   - NetworkError  → retry button + "check your network"
 *   - AuthError(401) → redirect to /signin
 *   - AuthError(403) → "permission denied" inline
 *   - ValidationError → per-field inline errors (fields map)
 *   - NotFoundError  → 404 page / empty state
 *   - ConflictError  → inline "already exists" message
 *   - ServerError    → generic "try again" with trace ID for support
 *
 * Wire format tolerates both legacy `{ code, message }` (leadkart-go
 * current) and RFC 9457 ProblemDetails `{ code, title, detail, fields,
 * trace_id }` (per ADR 0038 §A.9). Both shapes map to the same subclass.
 */

// ── Wire body shapes ────────────────────────────────────────────────────

/**
 * Legacy leadkart-go ErrorResponse envelope.
 * `{ "error": "slug_taken", "message": "..." }`
 */
export interface LegacyApiErrorBody {
	error?: string;
	code?: string;
	message?: string;
	details?: Record<string, unknown>;
}

/**
 * RFC 9457 ProblemDetails — extended shape per ADR 0038 §A.9.
 * `{ "code": "validation_failed", "title": "...", "detail": "...",
 *    "fields": { "email": "..." }, "trace_id": "req_..." }`
 */
export interface ProblemDetails {
	code?: string;
	title?: string;
	detail?: string;
	message?: string;
	fields?: Record<string, string>;
	trace_id?: string;
	retryable?: boolean;
}

/** Union of both wire shapes. */
export type ApiErrorBody = LegacyApiErrorBody | ProblemDetails;

// ── Base class ────────────────────────────────────────────────────────────

export class ApiError extends Error {
	/**
	 * HTTP status code — present on subclasses that carry a status
	 * (AuthError, ValidationError, ServerError) and on the generic
	 * 4xx base path. Absent for transport errors (NetworkError,
	 * TimeoutError). Preserved for backward compat with call sites
	 * that do `isApiError(err) && err.status === 401`.
	 */
	readonly status: number | undefined;
	readonly traceId: string | undefined;
	/**
	 * Wire-level error code from the response body (legacy `code` or
	 * RFC 9457 `code`). Subclasses already discriminate by HTTP status;
	 * this field preserves the finer-grained reason so callers can
	 * pattern-match on it (e.g. 422 → 'password_breached' vs 'password_same').
	 */
	code: string | undefined;

	constructor(status?: number, traceId?: string, code?: string) {
		super('An unexpected error occurred.');
		this.name = 'ApiError';
		this.status = status;
		this.traceId = traceId;
		this.code = code;
	}

	// ── Factory: maps HTTP response → typed subclass ──────────────────────

	static fromResponse(response: Response, body: ApiErrorBody | null): ApiError {
		const b = body as (ProblemDetails & LegacyApiErrorBody) | null;
		const traceId = b?.trace_id;
		const code = b?.code ?? b?.error;

		let err: ApiError;
		switch (response.status) {
			case 401:
				err = new AuthError(401, traceId);
				break;
			case 403:
				err = new AuthError(403, traceId);
				break;
			case 404:
				err = new NotFoundError(response.url ?? 'unknown resource', traceId);
				break;
			case 409: {
				const detail = b?.detail ?? b?.message ?? 'Conflict';
				err = new ConflictError(detail, traceId);
				break;
			}
			case 422:
			case 400: {
				const fields: Record<string, string> = b?.fields ?? {};
				err = new ValidationError(fields, response.status as 400 | 422, traceId);
				break;
			}
			default:
				if (response.status >= 500) {
					err = new ServerError(response.status, body, traceId);
				} else {
					err = new ApiError(response.status, traceId);
					err.message =
						b?.message ?? b?.detail ?? b?.title ?? response.statusText ?? 'Request failed';
				}
		}
		if (code) err.code = code;
		return err;
	}

	// ── Factory: maps transport-level throw → typed subclass ─────────────

	/**
	 * Wraps the raw error thrown by `fetch()`:
	 *   - `DOMException { name: 'AbortError' }` → `TimeoutError`
	 *   - `TypeError` (network down, CORS, DNS) → `NetworkError`
	 *   - anything else → `NetworkError` (safe default)
	 */
	static transport(cause: unknown): NetworkError | TimeoutError {
		if (cause instanceof DOMException && cause.name === 'AbortError') {
			return new TimeoutError();
		}
		return new NetworkError(cause);
	}

	/** Sentinel for the silent-refresh path: 401 + refresh also failed. */
	static refreshFailed(): AuthError {
		const err = new AuthError(401);
		err.message = 'Session expired. Please sign in again.';
		return err;
	}
}

// ── Subclasses ────────────────────────────────────────────────────────────

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

/** 400 or 422 with structured field-level validation failures. */
export class ValidationError extends ApiError {
	declare readonly status: 400 | 422;

	constructor(
		public readonly fields: Record<string, string>,
		status: 400 | 422,
		traceId?: string
	) {
		super(status, traceId);
		this.name = 'ValidationError';
		const count = Object.keys(fields).length;
		this.message =
			count > 0 ? `Validation failed: ${Object.values(fields).join('; ')}` : 'Validation failed';
	}
}

/** 401 or 403 — auth/authz failure. */
export class AuthError extends ApiError {
	declare readonly status: 401 | 403;

	constructor(status: 401 | 403, traceId?: string) {
		super(status, traceId);
		this.name = 'AuthError';
		this.message =
			status === 401 ? 'Sign in to continue.' : "You don't have permission for this action.";
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

// ── Legacy compat ─────────────────────────────────────────────────────────

/** Type predicate — narrows `unknown` to `ApiError` safely. */
export function isApiError(value: unknown): value is ApiError {
	return value instanceof ApiError;
}

/** Sentinel codes used by client.ts (preserved for backward compat). */
export const TRANSPORT_ERROR = 'transport';
export const REFRESH_FAILED = 'auth.refresh_failed';

/** Re-export the user-copy mapper so callers `import { getListErrorMessage } from '$api/errors'`. */
export { getListErrorMessage } from './error-messages';
