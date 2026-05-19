import { describe, expect, it } from 'vitest';
import {
	ApiError,
	NetworkError,
	TimeoutError,
	ServerError,
	ValidationError,
	AuthError,
	NotFoundError,
	ConflictError
} from '$lib/api/errors';

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

describe('ApiError.fromResponse — RFC 9457 ProblemDetails mapping', () => {
	function makeResponse(status: number): Response {
		return {
			status,
			url: '/v1/tenants',
			statusText: 'Error',
			ok: false
		} as unknown as Response;
	}

	it('maps 401 → AuthError(401)', () => {
		const err = ApiError.fromResponse(makeResponse(401), null);
		expect(err).toBeInstanceOf(AuthError);
		expect((err as unknown as AuthError).status).toBe(401);
	});

	it('maps 403 → AuthError(403)', () => {
		const err = ApiError.fromResponse(makeResponse(403), null);
		expect(err).toBeInstanceOf(AuthError);
		expect((err as unknown as AuthError).status).toBe(403);
	});

	it('maps 404 → NotFoundError with resource hint from url', () => {
		const resp = { ...makeResponse(404), url: '/v1/tenants/unknown' } as unknown as Response;
		const err = ApiError.fromResponse(resp, null);
		expect(err).toBeInstanceOf(NotFoundError);
		expect((err as unknown as NotFoundError).resource).toBe('/v1/tenants/unknown');
	});

	it('maps 409 → ConflictError with detail from body', () => {
		const body = { detail: 'slug taken', code: 'conflict' };
		const err = ApiError.fromResponse(makeResponse(409), body);
		expect(err).toBeInstanceOf(ConflictError);
		expect((err as unknown as ConflictError).detail).toBe('slug taken');
	});

	it('maps 422 → ValidationError with fields from RFC 9457 body', () => {
		const body = { fields: { email: 'invalid' }, trace_id: 'tr-1' };
		const err = ApiError.fromResponse(makeResponse(422), body);
		expect(err).toBeInstanceOf(ValidationError);
		expect((err as unknown as ValidationError).fields).toEqual({ email: 'invalid' });
		expect((err as unknown as ValidationError).traceId).toBe('tr-1');
	});

	it('maps 422 with legacy { code, message } body — empty fields, no crash', () => {
		const body = { code: 'invalid_body', message: 'bad request' };
		const err = ApiError.fromResponse(makeResponse(422), body);
		expect(err).toBeInstanceOf(ValidationError);
		expect((err as unknown as ValidationError).fields).toEqual({});
	});

	it('maps 500 → ServerError', () => {
		const body = { code: 'internal', message: 'boom' };
		const err = ApiError.fromResponse(makeResponse(500), body);
		expect(err).toBeInstanceOf(ServerError);
		expect((err as unknown as ServerError).status).toBe(500);
	});

	it('maps generic 4xx → ApiError (base)', () => {
		const err = ApiError.fromResponse(makeResponse(429), null);
		// Should not be a subclass — just ApiError
		expect(err).toBeInstanceOf(ApiError);
		expect(err).not.toBeInstanceOf(AuthError);
		expect(err).not.toBeInstanceOf(ValidationError);
		expect(err).not.toBeInstanceOf(ServerError);
	});

	it('captures trace_id on ApiError base', () => {
		const body = { trace_id: 'trace-999' };
		const err = ApiError.fromResponse(makeResponse(429), body);
		expect(err.traceId).toBe('trace-999');
	});
});

describe('ApiError.transport', () => {
	it('wraps TypeError from fetch into NetworkError', () => {
		const cause = new TypeError('Failed to fetch');
		const err = ApiError.transport(cause);
		expect(err).toBeInstanceOf(NetworkError);
		expect((err as unknown as NetworkError).cause).toBe(cause);
	});

	it('wraps abort-controller DOMException into TimeoutError', () => {
		const abortErr = new DOMException('The operation was aborted.', 'AbortError');
		const err = ApiError.transport(abortErr);
		expect(err).toBeInstanceOf(TimeoutError);
	});
});
