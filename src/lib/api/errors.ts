/**
 * Typed API error surface — discriminated union via `code` (the wire-
 * stable string sentinel from leadkart-go's problem-details body).
 *
 * Industry canon (TanStack Query, Stripe SDK, shadcn-svelte error
 * patterns): callers pattern-match on `error.code` for specific
 * handling, on `error.status` for HTTP-tier classification. Method-
 * shaped predicates (`isUnauthorized()` etc.) are 2010-Java style;
 * 2026 TS is tagged-union pattern-matching.
 *
 *   if (err.code === 'auth.invalid_credentials') { ... }
 *   if (err.status === 401) { ... }
 *
 * Shape mirrors RFC 7807 problem-details (used by leadkart-go's
 * `ErrorResponse`): `{ code, message, details? }`.
 */

/**
 * Wire-shape of leadkart-go's ErrorResponse — the canonical error
 * envelope returned on every non-2xx (see
 * `internal/identity/ports/dto.go`):
 *
 *   { "error": "<machine-parseable code>", "message": "<human-readable>" }
 *
 * `code` is accepted as a fallback for any future RFC 7807 / RFC 9457
 * "problem-detail" backend that uses the standard field name. Either
 * shape produces the same `ApiError.code` value after normalisation.
 */
export interface ApiErrorBody {
	/** leadkart-go shape — preferred. */
	error?: string;
	/** RFC 7807 / RFC 9457 fallback. */
	code?: string;
	message?: string;
	details?: Record<string, unknown>;
}

/**
 * Sentinel for transport-level failures (network down, fetch threw,
 * DNS, etc.). Status 0 — never reaches the server.
 */
export const TRANSPORT_ERROR = 'transport';

/**
 * Sentinel for the silent-refresh path: the original request returned
 * 401, the refresh attempt also failed; caller treats this as "user
 * needs to re-authenticate" (typically a redirect to /signin).
 */
export const REFRESH_FAILED = 'auth.refresh_failed';

export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly details?: Record<string, unknown>;

	constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.details = details;
	}

	static fromResponse(response: Response, body: ApiErrorBody | null): ApiError {
		// leadkart-go uses `error` as the machine-parseable code field;
		// `code` is the RFC 7807 fallback. Normalise both into ApiError.code
		// so feature forms can pattern-match: `if (err.code === 'invalid_slug') {...}`.
		const code = body?.error ?? body?.code ?? `http.${response.status}`;
		const message = body?.message ?? response.statusText ?? 'request failed';
		return new ApiError(response.status, code, message, body?.details);
	}

	static transport(cause: unknown): ApiError {
		const msg = cause instanceof Error ? cause.message : String(cause);
		return new ApiError(0, TRANSPORT_ERROR, msg);
	}

	static refreshFailed(): ApiError {
		return new ApiError(401, REFRESH_FAILED, 'session refresh failed');
	}
}

/** Type predicate so callers can narrow `unknown` errors safely. */
export function isApiError(value: unknown): value is ApiError {
	return value instanceof ApiError;
}
