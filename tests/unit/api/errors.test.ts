import { afterEach, describe, expect, it, vi } from 'vitest';
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
	RateLimitError,
	parseRetryAfter,
	describeError,
	describeReasonError
} from '#lib/api/errors.ts';
import { SCOPE_EXPIRED_MESSAGE } from '#lib/api/scope-header.ts';

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
		it("carries Go's text as `detail`, never as the message", () => {
			const err = new ConflictError(undefined, undefined, 'slug already taken');
			expect(err.name).toBe('ConflictError');
			expect(err.detail).toBe('slug already taken');
			expect(err.message).toBe(
				'This change conflicts with the current state. Refresh and try again.'
			);
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
		expect(e.message).toBe('The request could not be completed. Please try again.');
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
		expect((err as ConflictError).detail).toBe('lead is closed');
		expect(err.message).not.toContain('lead is closed');
	});
	it('maps Go `errors` (string arrays) to first-message fields and keeps the detail', () => {
		const err = ApiError.fromResponse(res(422), {
			error: 'validation_failed',
			detail: 'One or more fields are invalid',
			errors: { new_password: ['too short', 'no digit'], email: [] }
		}) as ValidationError;
		expect(err.fields).toEqual({ new_password: 'too short' });
		expect(err.detail).toBe('One or more fields are invalid');
		expect(err.message).toBe('Check the highlighted fields.');
		expect(err.hasFieldErrors).toBe(true);
	});
	it('keeps the text of a 400 without field errors in `detail`, not the message', () => {
		const err = ApiError.fromResponse(res(400), {
			error: 'invalid_email',
			message: 'mail: no angle-addr'
		}) as ValidationError;
		expect(err.hasFieldErrors).toBe(false);
		expect(err.detail).toBe('mail: no angle-addr');
		expect(err.message).toBe('The request was not accepted. Check the values and try again.');
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

describe('Go tenant-scope codes', () => {
	it.each([
		['invalid_tenant_scope', 400],
		['tenant_scope_not_found', 404],
		['scope_invalid', 409]
	])('%s (%i) -> ScopeInvalidError: fixed copy, Go text in detail, code kept', (code, status) => {
		const err = ApiError.fromResponse(res(status), {
			error: code,
			message: 'X-Tenant-Id must be a tenant UUID'
		}) as ScopeInvalidError;
		expect(err).toBeInstanceOf(ScopeInvalidError);
		expect(err.code).toBe(code);
		expect(err.status).toBe(status);
		expect(err.message).toBe(SCOPE_EXPIRED_MESSAGE);
		expect(err.detail).toBe('X-Tenant-Id must be a tenant UUID');
	});
	it('a scope error without Go text still carries the fixed copy', () => {
		const err = ApiError.fromResponse(res(404), { error: 'tenant_scope_not_found' });
		expect(err.message).toBe(SCOPE_EXPIRED_MESSAGE);
	});
	it('tenant_scope_not_supported (403) is an AuthError that does not exit scope', () => {
		const err = ApiError.fromResponse(res(403), {
			error: 'tenant_scope_not_supported',
			message: 'not for tenant scope'
		});
		expect(err).toBeInstanceOf(AuthError);
		expect(err).not.toBeInstanceOf(ScopeInvalidError);
		expect(err.status).toBe(403);
		expect(err.code).toBe('tenant_scope_not_supported');
		expect(err.message).toBe(
			'Not available while acting in a tenant. Exit the tenant context first.'
		);
	});
	it('tenant_scope_conflict (400) is a ValidationError that does not exit scope', () => {
		const err = ApiError.fromResponse(res(400), {
			error: 'tenant_scope_conflict',
			message: 'tenant_id conflicts with X-Tenant-Id'
		});
		expect(err).toBeInstanceOf(ValidationError);
		expect(err.code).toBe('tenant_scope_conflict');
		expect(err.message).toMatch(/different tenant/);
	});
	it('tenant_not_active (409) is a ConflictError with suspended copy', () => {
		const err = ApiError.fromResponse(res(409), { error: 'tenant_not_active', message: 'x' });
		expect(err).toBeInstanceOf(ConflictError);
		expect(err.code).toBe('tenant_not_active');
		expect(err.message).toBe('This tenant is not active. Changes are disabled.');
	});
	it('tenant_scope_conflict (400) shows the fixed copy, not Go text', () => {
		const err = ApiError.fromResponse(res(400), {
			error: 'tenant_scope_conflict',
			message: 'tenant_id conflicts with X-Tenant-Id'
		});
		expect(err.message).toBe(
			'This action targets a different tenant than the one you are acting in. Exit the tenant context and try again.'
		);
	});
});

describe('parseRetryAfter', () => {
	afterEach(() => vi.useRealTimers());
	it.each([
		['30', 30],
		[' 7 ', 7],
		['0', 0],
		['999999', 86_400],
		[' ', undefined],
		['', undefined],
		[null, undefined],
		['0x1E', undefined],
		['-5', undefined],
		['1.5', undefined],
		['1e3', undefined],
		['foo 2099', undefined],
		['soon', undefined]
	])('%j -> %j', (input, expected) => {
		expect(parseRetryAfter(input)).toBe(expected);
	});
	it('accepts an IMF-fixdate relative to now; past -> 0; far future capped', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('Wed, 21 Oct 2015 07:28:00 GMT'));
		expect(parseRetryAfter('Wed, 21 Oct 2015 07:28:30 GMT')).toBe(30);
		expect(parseRetryAfter('Wed, 21 Oct 2015 07:00:00 GMT')).toBe(0);
		expect(parseRetryAfter('Thu, 21 Oct 2100 07:28:00 GMT')).toBe(86_400);
	});
	it('rejects a non-IMF date string even if Date.parse accepts it', () => {
		expect(parseRetryAfter('2099-01-01')).toBeUndefined();
		expect(parseRetryAfter('foo Thu, 21 Oct 2100 07:28:00 GMT')).toBeUndefined();
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
	it("keeps Go's text in `detail`, shows the fixed line", () => {
		const err = ApiError.fromResponse(res(404), {
			error: 'user_not_found',
			message: 'User not found'
		}) as NotFoundError;
		expect(err.message).toBe('This item no longer exists.');
		expect(err.detail).toBe('User not found');
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
	it('a 409 shows the fixed conflict line; Go text, when sent, is only `detail`', () => {
		const err = ApiError.fromResponse(res(409), { error: 'x' }) as ConflictError;
		expect(err.detail).toBeUndefined();
		expect(err.message).toMatch(/conflicts/i);
		const withText = ApiError.fromResponse(res(409), { message: 'taken' }) as ConflictError;
		expect(withText.detail).toBe('taken');
		expect(withText.message).toBe(err.message);
	});
	it('403 csrf_mismatch gets reload copy', () => {
		const err = ApiError.fromResponse(res(403), {
			error: 'csrf_mismatch',
			message: 'CSRF token missing or invalid'
		});
		expect(err).toBeInstanceOf(AuthError);
		expect(err.message).toMatch(/reload the page/i);
	});
	it('a 401 shows allowlisted copy for a known code, otherwise the generic line (never Go text)', () => {
		expect(
			ApiError.fromResponse(res(401), {
				error: 'incorrect_current_password',
				message: 'Current password is incorrect'
			}).message
		).toBe('Your current password is incorrect.');
		expect(
			ApiError.fromResponse(res(401), { error: 'some_new_code', message: 'raw go text' }).message
		).toBe('Sign in to continue.');
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

describe('403 code to copy map', () => {
	const res = (status: number) => new Response(null, { status });
	it.each([
		['csrf_mismatch', 'Your session token is out of date — reload the page and try again.'],
		[
			'tenant_scope_not_supported',
			'Not available while acting in a tenant. Exit the tenant context first.'
		],
		[
			'tenant_scope_read_only',
			'Read-only while acting in a tenant. Exit the tenant context to make this change.'
		],
		['tenant_scope_forbidden', "You don't have permission to act in another tenant."]
	])('%s becomes an AuthError 403 with fixed copy and keeps its code', (code, copy) => {
		const err = ApiError.fromResponse(res(403), { error: code, message: 'raw Go text' });
		expect(err).toBeInstanceOf(AuthError);
		expect(err.status).toBe(403);
		expect(err.message).toBe(copy);
		expect(err.code).toBe(code);
	});
	it("an unknown 403 code shows the generic line; Go's text is `detail`", () => {
		const err = ApiError.fromResponse(res(403), {
			error: 'some_new_code',
			message: 'nope'
		}) as AuthError;
		expect(err.message).toBe("You don't have permission to do this.");
		expect(err.detail).toBe('nope');
	});
});

describe('code to copy map (Go codes with fixed user copy)', () => {
	it.each([
		[403, 'forbidden', "You don't have permission to do this."],
		[403, 'grant_exceeds_authority', "You can't grant a permission or role above your own."],
		[403, 'self_modification_forbidden', "You can't make this change to your own account."],
		[403, 'search_category_forbidden', "You don't have access to that search category."],
		[
			400,
			'invalid_search_include',
			'The request was not accepted. Check the values and try again.'
		],
		[409, 'tenant_not_active', 'This tenant is not active. Changes are disabled.'],
		[
			409,
			'tenant_has_dependents',
			"This tenant still has members or data, so it can't be deleted yet."
		],
		[422, 'permission_not_requestable', "This permission can't be requested."],
		[403, 'insufficient_rank', 'You can only make this change for people below your level.'],
		[409, 'last_owner_protected', 'A company must keep at least one active owner.'],
		[409, 'owner_protected', "An owner's administrator access can't be removed."],
		[409, 'role_system_default', "Built-in roles can't be changed or deleted."],
		[422, 'manager_not_eligible', "This person can't be set as the manager."],
		[422, 'role_parent_not_eligible', 'The parent role must be more senior.'],
		[403, 'impersonation_not_allowed', 'Not available during an impersonation session.'],
		[401, 'incorrect_current_password', 'Your current password is incorrect.']
	])('%i %s shows fixed copy whatever Go says', (status, code, copy) => {
		const err = ApiError.fromResponse(res(status), { error: code, message: 'raw Go text' });
		expect(err.message).toBe(copy);
		expect(err.code).toBe(code);
		expect(describeError(err)).toBe(copy);
	});
});

describe('server error copy', () => {
	it('a plain 5xx does not claim anyone was notified', () => {
		const err = ApiError.fromResponse(res(500), { error: 'internal_error' });
		expect(err.message).toBe('Something went wrong on our side. Please try again.');
	});
	it.each([503, 504])('a %i says the service is not reachable', (status) => {
		const err = ApiError.fromResponse(res(status), { error: 'upstream_timeout' });
		expect(err.message).toBe(
			'The service is not reachable right now. Please try again in a moment.'
		);
	});
});

describe('describeError', () => {
	const res = (status: number) => new Response(null, { status });
	const opts = {
		fallback: 'Failed to do it.',
		status: {
			403: "You don't have permission to do it.",
			404: 'Gone.',
			409: 'Already done.'
		}
	};
	it('non-ApiError uses the fallback, default "Something went wrong"', () => {
		expect(describeError(new Error('x'), opts)).toBe('Failed to do it.');
		expect(describeError('x')).toBe('Something went wrong');
	});
	it('an ApiError speaks with its own message by default', () => {
		expect(describeError(new NetworkError(new TypeError('x')))).toBe(
			new NetworkError(null).message
		);
	});
	it("a plain 403 returns the caller's line", () => {
		const err = ApiError.fromResponse(res(403), { error: 'forbidden', message: 'Go text' });
		expect(describeError(err, opts)).toBe("You don't have permission to do it.");
	});
	it.each(['tenant_scope_not_supported', 'tenant_scope_read_only', 'tenant_scope_forbidden'])(
		'%s keeps the context copy even when the caller passes its own 403 line',
		(code) => {
			const err = ApiError.fromResponse(res(403), { error: code });
			expect(describeError(err, opts)).toBe(err.message);
			expect(describeError(err, opts)).not.toBe(opts.status[403]);
		}
	);
	it('404 override applies; a scope-dead 404 keeps the scope copy', () => {
		expect(describeError(ApiError.fromResponse(res(404), null), opts)).toBe('Gone.');
		const dead = ApiError.fromResponse(res(404), { error: 'tenant_scope_not_found' });
		expect(describeError(dead, opts)).toBe(SCOPE_EXPIRED_MESSAGE);
	});
	describe('precedence', () => {
		const fixed = (code: string, status = 403) =>
			ApiError.fromResponse(res(status), { error: code, message: 'Go text' });
		it("a caller's own 403 line beats the plain `forbidden` copy; without one the copy shows", () => {
			expect(describeError(fixed('forbidden'), opts)).toBe("You don't have permission to do it.");
			expect(describeError(fixed('forbidden'))).toBe("You don't have permission to do this.");
		});
		it("a caller's 403 line never beats tenant_scope_* codes, including tenant_scope_conflict", () => {
			for (const [code, status] of [
				['tenant_scope_forbidden', 403],
				['tenant_scope_read_only', 403],
				['tenant_scope_not_supported', 403],
				['tenant_scope_conflict', 400]
			] as const) {
				const err = fixed(code, status);
				expect(describeError(err, { status: { 403: 'caller 403', 400: 'caller 400' } })).toBe(
					err.message
				);
			}
		});
		it("a specific code (grant_exceeds_authority, self_modification_forbidden) beats the caller's generic 403 line", () => {
			for (const code of ['grant_exceeds_authority', 'self_modification_forbidden']) {
				const err = fixed(code);
				expect(describeError(err, opts)).toBe(err.message);
				expect(describeError(err, opts)).not.toBe(opts.status[403]);
			}
		});
		it("tenant_not_active beats the caller's 409 line", () => {
			const err = fixed('tenant_not_active', 409);
			expect(describeError(err, opts)).toBe('This tenant is not active. Changes are disabled.');
		});
	});
	describe('validation errors', () => {
		const generic = 'The request was not accepted. Check the values and try again.';
		it('without field errors never shows Go text; caller line for the status, else the generic line', () => {
			const err = ApiError.fromResponse(res(422), { message: 'role_id must be a UUID' });
			expect(describeError(err)).toBe(generic);
			expect(describeError(err, { status: { 422: 'Pick a valid role.' } })).toBe(
				'Pick a valid role.'
			);
			const e400 = ApiError.fromResponse(res(400), { message: 'bad json at offset 3' });
			expect(describeError(e400, { status: { 422: 'x', 400: 'Bad input.' } })).toBe('Bad input.');
			expect(describeError(e400)).toBe(generic);
		});
		it('with field errors keeps the field text (it also reaches the form fields)', () => {
			const err = ApiError.fromResponse(res(422), { errors: { email: ['Email is taken'] } });
			expect(describeError(err, { status: { 422: 'ignored' } })).toBe(
				'Check the highlighted fields.'
			);
			expect((err as ValidationError).fields).toEqual({ email: 'Email is taken' });
		});
	});
	it("the caller's 409 line wins over Go's text; with no caller line the generic line shows", () => {
		expect(describeError(ApiError.fromResponse(res(409), null), opts)).toBe('Already done.');
		const withText = ApiError.fromResponse(res(409), { message: 'Slug taken' });
		expect(describeError(withText, opts)).toBe('Already done.');
		expect(describeError(withText)).toBe(
			'This change conflicts with the current state. Refresh and try again.'
		);
	});
	it("a caller's own 400 line beats the generic invalid_search_include copy", () => {
		const err = ApiError.fromResponse(res(400), { error: 'invalid_search_include' });
		expect(describeError(err, { status: { 400: 'Pick a search type.' } })).toBe(
			'Pick a search type.'
		);
		expect(describeError(err)).toBe(
			'The request was not accepted. Check the values and try again.'
		);
	});
});

describe('no backend-authored text reaches a user by default', () => {
	const RAW = 'RAW-GO-TEXT internal detail';
	// A status/code Go might add tomorrow: nothing allowlists it, so its text must never show.
	it.each([400, 401, 403, 404, 409, 418, 422, 423, 500, 502])(
		'%i with an unknown code: message and describeError never carry Go text',
		(status) => {
			const err = ApiError.fromResponse(new Response(null, { status }), {
				error: 'brand_new_code',
				message: RAW,
				detail: RAW,
				title: RAW
			});
			expect(err.message).not.toContain('RAW-GO-TEXT');
			expect(describeError(err)).not.toContain('RAW-GO-TEXT');
			expect(err.message.length).toBeGreaterThan(0);
		}
	);

	it('a ValidationError with field errors says so generically; the fields keep their text for the form', () => {
		const err = ApiError.fromResponse(new Response(null, { status: 422 }), {
			message: RAW,
			errors: { name: ['name is too short'] }
		}) as ValidationError;
		expect(err.message).toBe('Check the highlighted fields.');
		expect(err.fields).toEqual({ name: 'name is too short' });
	});

	it('the unknown-status ApiError uses a fixed line, not statusText or title', () => {
		const r = new Response(null, { status: 418, statusText: 'I am a teapot' });
		const err = ApiError.fromResponse(r, { title: RAW });
		expect(err.message).toBe('The request could not be completed. Please try again.');
	});
});

describe('describeReasonError (the reason dialogs share one error branch)', () => {
	const opts = { fallback: 'Failed.', status: { 403: 'Not yours.' } };

	it('a field error on `reason` stays on the field, no banner', () => {
		const err = new ValidationError({ reason: 'Reason is required' }, 422);
		expect(describeReasonError(err, opts)).toEqual({
			reasonError: 'Reason is required',
			banner: null
		});
	});

	it('anything else is the one banner line from describeError', () => {
		expect(describeReasonError(new AuthError(403), opts)).toEqual({
			reasonError: null,
			banner: 'Not yours.'
		});
		expect(describeReasonError(new Error('x'), opts)).toEqual({
			reasonError: null,
			banner: 'Failed.'
		});
	});
});
