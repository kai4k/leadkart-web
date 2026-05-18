/**
 * Boundary-validation tests for operator/impersonation Zod schemas.
 *
 * Covers:
 *   - createImpersonationSessionRequestSchema: strict mode, reason min-length, duration bounds
 *   - createImpersonationSessionResponseSchema: parses valid 201 body
 *   - impersonationSessionDtoSchema: parses full DTO
 *   - listImpersonationSessionsResponseSchema: wraps array correctly
 */
import { describe, expect, it } from 'vitest';
import {
	createImpersonationSessionRequestSchema,
	createImpersonationSessionResponseSchema,
	impersonationSessionDtoSchema,
	listImpersonationSessionsResponseSchema
} from '$lib/features/operator/impersonation/schemas';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_REQUEST = {
	target_tenant_id: 'tenant-abc-123',
	reason: 'Investigating billing discrepancy reported by user'
};

const VALID_SESSION_DTO = {
	session_id: 'sess-001',
	operator_id: 'op-001',
	target_tenant_id: 'tenant-abc-123',
	reason: 'Investigating billing discrepancy',
	created_at: '2026-05-18T10:00:00Z',
	expires_at: '2026-05-18T10:30:00Z'
};

// ---------------------------------------------------------------------------
// createImpersonationSessionRequestSchema — reason min-length
// ---------------------------------------------------------------------------

describe('createImpersonationSessionRequestSchema — reason', () => {
	it('accepts a valid request with reason ≥10 chars', () => {
		expect(createImpersonationSessionRequestSchema.safeParse(VALID_REQUEST).success).toBe(true);
	});

	it('accepts reason of exactly 10 characters', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				...VALID_REQUEST,
				reason: '1234567890'
			}).success
		).toBe(true);
	});

	it('rejects reason shorter than 10 characters', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				...VALID_REQUEST,
				reason: 'too short'
			}).success
		).toBe(false);
	});

	it('rejects empty reason', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				...VALID_REQUEST,
				reason: ''
			}).success
		).toBe(false);
	});

	it('rejects reason longer than 500 characters', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				...VALID_REQUEST,
				reason: 'x'.repeat(501)
			}).success
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// createImpersonationSessionRequestSchema — duration bounds
// ---------------------------------------------------------------------------

describe('createImpersonationSessionRequestSchema — duration_minutes', () => {
	it('accepts request without duration (optional)', () => {
		expect(createImpersonationSessionRequestSchema.safeParse(VALID_REQUEST).success).toBe(true);
	});

	it('accepts duration_minutes = 1 (lower bound)', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				...VALID_REQUEST,
				duration_minutes: 1
			}).success
		).toBe(true);
	});

	it('accepts duration_minutes = 240 (upper bound)', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				...VALID_REQUEST,
				duration_minutes: 240
			}).success
		).toBe(true);
	});

	it('rejects duration_minutes = 0 (below lower bound)', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				...VALID_REQUEST,
				duration_minutes: 0
			}).success
		).toBe(false);
	});

	it('rejects duration_minutes = 241 (above upper bound)', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				...VALID_REQUEST,
				duration_minutes: 241
			}).success
		).toBe(false);
	});

	it('rejects non-integer duration (float)', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				...VALID_REQUEST,
				duration_minutes: 30.5
			}).success
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// createImpersonationSessionRequestSchema — strict mode
// ---------------------------------------------------------------------------

describe('createImpersonationSessionRequestSchema — strict mode', () => {
	it('rejects extra fields', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				...VALID_REQUEST,
				extra_field: 'should-fail'
			}).success
		).toBe(false);
	});

	it('rejects missing target_tenant_id', () => {
		expect(
			createImpersonationSessionRequestSchema.safeParse({
				reason: 'Valid reason here'
			}).success
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// createImpersonationSessionResponseSchema
// ---------------------------------------------------------------------------

describe('createImpersonationSessionResponseSchema', () => {
	it('parses a valid 201 response', () => {
		const result = createImpersonationSessionResponseSchema.safeParse({
			session_id: 'sess-uuid-001',
			expires_at_utc: '2026-05-18T10:30:00Z'
		});
		expect(result.success).toBe(true);
	});

	it('rejects response missing session_id', () => {
		expect(
			createImpersonationSessionResponseSchema.safeParse({
				expires_at_utc: '2026-05-18T10:30:00Z'
			}).success
		).toBe(false);
	});

	it('rejects response missing expires_at_utc', () => {
		expect(
			createImpersonationSessionResponseSchema.safeParse({
				session_id: 'sess-uuid-001'
			}).success
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// impersonationSessionDtoSchema
// ---------------------------------------------------------------------------

describe('impersonationSessionDtoSchema', () => {
	it('parses a valid full DTO', () => {
		expect(impersonationSessionDtoSchema.safeParse(VALID_SESSION_DTO).success).toBe(true);
	});

	it('rejects DTO missing operator_id', () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { operator_id: _op, ...rest } = VALID_SESSION_DTO;
		expect(impersonationSessionDtoSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects DTO missing expires_at', () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { expires_at: _exp, ...rest } = VALID_SESSION_DTO;
		expect(impersonationSessionDtoSchema.safeParse(rest).success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// listImpersonationSessionsResponseSchema
// ---------------------------------------------------------------------------

describe('listImpersonationSessionsResponseSchema', () => {
	it('parses a list with one session', () => {
		const result = listImpersonationSessionsResponseSchema.safeParse({
			sessions: [VALID_SESSION_DTO]
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sessions).toHaveLength(1);
			expect(result.data.sessions[0].session_id).toBe('sess-001');
		}
	});

	it('parses an empty sessions list', () => {
		const result = listImpersonationSessionsResponseSchema.safeParse({ sessions: [] });
		expect(result.success).toBe(true);
	});

	it('rejects response missing sessions key', () => {
		expect(listImpersonationSessionsResponseSchema.safeParse({}).success).toBe(false);
	});
});
