/**
 * Typed API error surface. Mirrors the leadkart-go problem-details
 * shape (`{ code, message, details }`) used by the Identity HTTP
 * layer. Callers pattern-match on `error.code` for known classes
 * (`auth.invalid_credentials`, `auth.stale_token`, `validation.*`,
 * etc.) and on `error.status` for HTTP-tier classification.
 */

export interface ApiErrorBody {
	code?: string;
	message?: string;
	details?: Record<string, unknown>;
}

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
		const code = body?.code ?? `http.${response.status}`;
		const message = body?.message ?? response.statusText ?? 'request failed';
		return new ApiError(response.status, code, message, body?.details);
	}

	static transport(cause: unknown): ApiError {
		const msg = cause instanceof Error ? cause.message : String(cause);
		return new ApiError(0, 'transport', msg);
	}

	isUnauthorized(): boolean {
		return this.status === 401;
	}

	isForbidden(): boolean {
		return this.status === 403;
	}

	isValidation(): boolean {
		return this.status === 400 || this.status === 422;
	}
}
