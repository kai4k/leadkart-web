import { describe, expect, it } from 'vitest';
import {
	ApiError,
	NetworkError,
	TimeoutError,
	ServerError,
	ValidationError,
	AuthError,
	NotFoundError,
	ConflictError,
	ScopeInvalidError,
	SchemaError,
	RateLimitError
} from '#lib/api/errors.ts';

describe('Error subclass hierarchy', () => {
	describe('NetworkError', () => {
		it('has correct name and message', () => {
			const err = new NetworkError(new TypeError('Failed to fetch'));
			expect(err.name).toBe('NetworkError');
			expect(err).toBeInstanceOf(NetworkError);
			expect(err).toBeInstanceOf(ApiError);
			expect(err.message).toContain('network');
		});

		it('exposes cause', () => {
			const cause = new TypeError('Failed to fetch');
			const err = new NetworkError(cause);
			expect(err.cause).toBe(cause);
		});
	});

	describe('TimeoutError', () => {
		it('has correct name and message', () => {
			const err = new TimeoutError();
			expect(err.name).toBe('TimeoutError');
			expect(err).toBeInstanceOf(TimeoutError);
			expect(err).toBeInstanceOf(ApiError);
			expect(err.message).toBeTruthy();
		});
	});

	describe('ServerError', () => {
		it('has correct name, status, body', () => {
			const err = new ServerError(503, { code: 'service_unavailable' }, 'trace-abc');
			expect(err.name).toBe('ServerError');
			expect(err.status).toBe(503);
			expect(err.body).toEqual({ code: 'service_unavailable' });
			expect(err.traceId).toBe('trace-abc');
			expect(err).toBeInstanceOf(ServerError);
			expect(err).toBeInstanceOf(ApiError);
		});
	});

	describe('ValidationError', () => {
		it('populates fields from RFC 9457 body', () => {
			const err = new ValidationError(
				{ email: 'must be a valid email', password: 'min 8 chars' },
				422,
				undefined,
				'trace-xyz'
			);
			expect(err.name).toBe('ValidationError');
			expect(err.fields).toEqual({
				email: 'must be a valid email',
				password: 'min 8 chars'
			});
			expect(err.status).toBe(422);
			expect(err.traceId).toBe('trace-xyz');
			expect(err).toBeInstanceOf(ValidationError);
			expect(err).toBeInstanceOf(ApiError);
		});

		it('has empty fields when body has no fields', () => {
			const err = new ValidationError({}, 400);
			expect(err.fields).toEqual({});
		});
	});

	describe('AuthError', () => {
		it('discriminates 401 vs 403', () => {
			const e401 = new AuthError(401);
			const e403 = new AuthError(403);
			expect(e401.status).toBe(401);
			expect(e403.status).toBe(403);
			expect(e401.name).toBe('AuthError');
			expect(e403.name).toBe('AuthError');
			expect(e401.message).not.toBe(e403.message);
		});
	});

	describe('NotFoundError', () => {
		it('carries resource hint', () => {
			const err = new NotFoundError('/v1/tenants/missing-slug');
			expect(err.name).toBe('NotFoundError');
			expect(err.resource).toBe('/v1/tenants/missing-slug');
			expect(err).toBeInstanceOf(NotFoundError);
		});
	});

	describe('ConflictError', () => {
		it('carries detail', () => {
			const err = new ConflictError('slug already taken');
			expect(err.name).toBe('ConflictError');
			expect(err.detail).toBe('slug already taken');
		});
	});
});

const res = (status: number, headers: Record<string, string> = {}) =>
	new Response(null, { status, headers });

describe('ApiError.fromResponse — status mapping', () => {
	it('maps 401 and 403 to AuthError', () => {
		expect(ApiError.fromResponse(res(401), null)).toBeInstanceOf(AuthError);
		expect((ApiError.fromResponse(res(403), null) as AuthError).status).toBe(403);
	});
	it('carries the BFF session_expired code on the 401 AuthError', () => {
		const err = ApiError.fromResponse(res(401), { error: 'session_expired', message: 'x' });
		expect(err).toBeInstanceOf(AuthError);
		expect(err.code).toBe('session_expired');
	});
	it('maps the BFF refresh_unavailable 503 to a retryable ServerError', () => {
		const err = ApiError.fromResponse(res(503), { error: 'refresh_unavailable', message: 'x' });
		expect(err).toBeInstanceOf(ServerError);
		expect(err.code).toBe('refresh_unavailable');
	});
	it('maps 404 to NotFoundError', () => {
		expect(ApiError.fromResponse(res(404), null)).toBeInstanceOf(NotFoundError);
	});
	it('a Go 409 with any code stays a ConflictError', () => {
		expect(ApiError.fromResponse(res(409), { error: 'slug_taken' })).toBeInstanceOf(ConflictError);
	});
	it('maps 500 to ServerError and other 4xx to the base ApiError', () => {
		expect(ApiError.fromResponse(res(500), { error: 'internal_error' })).toBeInstanceOf(
			ServerError
		);
		const e = ApiError.fromResponse(res(418), { message: 'teapot' });
		expect(e.constructor).toBe(ApiError);
		expect(e.message).toBe('teapot');
	});
	it('ignores the removed code/fields/trace_id keys', () => {
		const err = ApiError.fromResponse(res(422), {
			code: 'x',
			fields: { a: 'b' },
			trace_id: 't'
		} as never) as ValidationError;
		expect(err.code).toBeUndefined();
		expect(err.fields).toEqual({});
		expect(err.traceId).toBeUndefined();
	});
});

describe('ApiError.fromResponse — Go and BFF envelopes', () => {
	it('reads the Go code from `error`, text from message then detail', () => {
		const err = ApiError.fromResponse(res(409), {
			error: 'lead_terminal',
			message: '',
			detail: 'lead is closed'
		});
		expect(err).toBeInstanceOf(ConflictError);
		expect(err.code).toBe('lead_terminal');
		expect(err.message).toBe('lead is closed');
	});
	it('maps Go `errors` (string arrays) to first-message fields and keeps the detail', () => {
		const err = ApiError.fromResponse(res(422), {
			error: 'validation_failed',
			detail: 'One or more fields are invalid',
			errors: { new_password: ['too short', 'no digit'], email: [] }
		}) as ValidationError;
		expect(err.fields).toEqual({ new_password: 'too short' });
		expect(err.detail).toBe('One or more fields are invalid');
		expect(err.message).toBe('One or more fields are invalid');
		expect(err.hasFieldErrors).toBe(true);
	});
	it('keeps the text of a 400 without field errors', () => {
		const err = ApiError.fromResponse(res(400), {
			error: 'invalid_email',
			message: 'mail: no angle-addr'
		}) as ValidationError;
		expect(err.hasFieldErrors).toBe(false);
		expect(err.message).toBe('mail: no angle-addr');
		expect(err.code).toBe('invalid_email');
	});
	it('maps the BFF envelope { error, message }', () => {
		const err = ApiError.fromResponse(res(409), {
			error: 'scope_invalid',
			message: 'Operator scope expired'
		});
		expect(err).toBeInstanceOf(ScopeInvalidError);
	});
	it('maps 429 to RateLimitError with Retry-After seconds', () => {
		const err = ApiError.fromResponse(res(429, { 'retry-after': '30' }), {
			error: 'rate_limited'
		}) as RateLimitError;
		expect(err).toBeInstanceOf(RateLimitError);
		expect(err.retryAfterSeconds).toBe(30);
	});
	it('takes the trace id from X-Correlation-ID', () => {
		const err = ApiError.fromResponse(res(500, { 'x-correlation-id': 'c-1' }), {
			error: 'internal_error'
		});
		expect(err.traceId).toBe('c-1');
	});
	it('maps a TimeoutError DOMException to TimeoutError and anything else to NetworkError', () => {
		expect(ApiError.transport(new DOMException('t', 'TimeoutError'))).toBeInstanceOf(TimeoutError);
		expect(ApiError.transport(new TypeError('Failed to fetch'))).toBeInstanceOf(NetworkError);
	});
});

describe('SchemaError', () => {
	it('is an ApiError with a user message and the issues', () => {
		const err = new SchemaError('GET /v1/users', [
			{ path: 'users.0.email', message: 'Invalid email' }
		]);
		expect(err).toBeInstanceOf(ApiError);
		expect(err.code).toBe('schema_mismatch');
		expect(err.issues).toHaveLength(1);
		expect(err.message).toMatch(/refresh/i);
	});
});

describe('ApiError.transport', () => {
	it('wraps TypeError from fetch into NetworkError', () => {
		const cause = new TypeError('Failed to fetch');
		const err = ApiError.transport(cause);
		expect(err).toBeInstanceOf(NetworkError);
		expect((err as unknown as NetworkError).cause).toBe(cause);
	});

	it('does not map a caller AbortError to TimeoutError', () => {
		const err = ApiError.transport(new DOMException('aborted', 'AbortError'));
		expect(err).toBeInstanceOf(NetworkError);
	});
});

describe('scope codes reach ScopeInvalidError (any status)', () => {
	it.each([
		['invalid_tenant_scope', 400],
		['tenant_scope_conflict', 400],
		['tenant_scope_not_found', 404],
		['tenant_scope_not_supported', 403],
		['scope_invalid', 409]
	])('%s (%i) -> ScopeInvalidError keeping its code and status', (code, status) => {
		const err = ApiError.fromResponse(res(status), { error: code, message: 'Go says no' });
		expect(err).toBeInstanceOf(ScopeInvalidError);
		expect(err.code).toBe(code);
		expect(err.status).toBe(status);
		expect(err.message).toBe('Go says no');
	});
	it('tenant_not_active is a scope error only when the request was scope-marked', () => {
		const body = { error: 'tenant_not_active', message: 'Tenant is suspended' };
		expect(ApiError.fromResponse(res(409), body, { scopeRequired: true })).toBeInstanceOf(
			ScopeInvalidError
		);
		expect(ApiError.fromResponse(res(409), body)).toBeInstanceOf(ConflictError);
		expect(ApiError.fromResponse(res(409), body, { scopeRequired: true }).code).toBe(
			'tenant_not_active'
		);
	});
	it('a scope error without Go text gets the default copy', () => {
		expect(ApiError.fromResponse(res(404), { error: 'tenant_scope_not_found' }).message).toMatch(
			/select the tenant again/i
		);
	});
});

describe('NotFoundError copy', () => {
	it('never leaks the URL or ids; the URL stays in `resource`', () => {
		const r = new Response(null, { status: 404 });
		Object.defineProperty(r, 'url', { value: 'http://host/api/v1/users/0b1c-uuid' });
		const err = ApiError.fromResponse(r, null) as NotFoundError;
		expect(err.message).toBe('This item no longer exists.');
		expect(err.message).not.toMatch(/http|uuid/);
		expect(err.resource).toBe('http://host/api/v1/users/0b1c-uuid');
	});
	it("uses Go's text when present", () => {
		expect(
			ApiError.fromResponse(res(404), { error: 'user_not_found', message: 'User not found' })
				.message
		).toBe('User not found');
	});
});

describe('fromResponse robustness', () => {
	it('flattenFieldErrors ignores malformed entries instead of throwing', () => {
		const bad = {
			errors: { a: 'str', b: 5, c: null, d: [1, '', '  ', 'ok'], e: {}, f: ['first'] }
		} as never;
		const err = ApiError.fromResponse(res(422), bad) as ValidationError;
		expect(err.fields).toEqual({ d: 'ok', f: 'first' });
		expect(ApiError.fromResponse(res(422), { errors: 'nope' } as never)).toBeInstanceOf(
			ValidationError
		);
		expect(ApiError.fromResponse(res(422), { errors: [1, 2] } as never)).toBeInstanceOf(
			ValidationError
		);
	});
	it('a body that is not an object does not throw', () => {
		expect(ApiError.fromResponse(res(500), 'oops' as never)).toBeInstanceOf(ServerError);
		expect(ApiError.fromResponse(res(400), 7 as never)).toBeInstanceOf(ValidationError);
	});
	it('a 409 without Go text leaves ConflictError.detail undefined (callers keep their own fallback)', () => {
		const err = ApiError.fromResponse(res(409), { error: 'x' }) as ConflictError;
		expect(err.detail).toBeUndefined();
		expect(err.message).toMatch(/conflicts/i);
		expect((ApiError.fromResponse(res(409), { message: 'taken' }) as ConflictError).detail).toBe(
			'taken'
		);
	});
	it('403 csrf_mismatch gets reload copy', () => {
		const err = ApiError.fromResponse(res(403), {
			error: 'csrf_mismatch',
			message: 'CSRF token missing or invalid'
		});
		expect(err).toBeInstanceOf(AuthError);
		expect(err.message).toMatch(/reload the page/i);
	});
	it('a 401 that is not session_expired shows the message; session_expired and bare 401 stay generic', () => {
		expect(
			ApiError.fromResponse(res(401), {
				error: 'incorrect_current_password',
				message: 'Current password is incorrect'
			}).message
		).toBe('Current password is incorrect');
		expect(ApiError.fromResponse(res(401), null).message).toBe('Sign in to continue.');
		expect(
			ApiError.fromResponse(res(401), { error: 'session_expired', message: 'Session expired' })
				.message
		).toBe('Sign in to continue.');
	});
	it('parses Retry-After for any status (423 account_locked)', () => {
		const err = ApiError.fromResponse(res(423, { 'retry-after': '120' }), {
			error: 'account_locked',
			message: 'Account locked'
		});
		expect(err.code).toBe('account_locked');
		expect(err.retryAfterSeconds).toBe(120);
		expect(ApiError.fromResponse(res(500, { 'retry-after': '5' }), null).retryAfterSeconds).toBe(5);
		expect(ApiError.fromResponse(res(423), null).retryAfterSeconds).toBeUndefined();
	});
});
