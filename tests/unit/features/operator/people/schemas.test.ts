/**
 * Boundary-validation tests for operator/people Zod schemas.
 *
 * Covers strict-mode rejection of extra fields, min-length enforcement
 * on required reason / name fields, and personDtoSchema parsing of a
 * complete PersonDto fixture.
 */
import { describe, expect, it } from 'vitest';
import {
	personDtoSchema,
	listPersonMembershipsResponseSchema,
	globalSuspendRequestSchema,
	updatePersonProfileRequestSchema,
	anonymisePersonRequestSchema
} from '$lib/features/operator/people/schemas';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_PERSON = {
	id: 'pid-001',
	email: 'raj@acme.test',
	first_name: 'Raj',
	last_name: 'Verma',
	is_active: true,
	is_anonymised: false,
	is_globally_suspended: false,
	created_at: '2026-01-01T00:00:00Z'
};

const VALID_USER_DTO = {
	membership_id: 'mid-001',
	person_id: 'pid-001',
	tenant_id: 'tid-001',
	email: 'raj@acme.test',
	first_name: 'Raj',
	last_name: 'Verma',
	status: 'active',
	designation: 'Engineer',
	department: 'Tech',
	status_message: '',
	joined_at: '2026-01-01T00:00:00Z',
	left_at: null,
	reports_to: null,
	role_ids: []
};

// ---------------------------------------------------------------------------
// personDtoSchema
// ---------------------------------------------------------------------------

describe('personDtoSchema', () => {
	it('parses a minimal valid PersonDto (no optional fields)', () => {
		const result = personDtoSchema.safeParse(VALID_PERSON);
		expect(result.success).toBe(true);
	});

	it('parses a PersonDto with all optional fields present', () => {
		const result = personDtoSchema.safeParse({
			...VALID_PERSON,
			global_suspension_reason: 'Spam activity',
			globally_suspended_at: '2026-03-01T12:00:00Z',
			anonymised_at: ''
		});
		expect(result.success).toBe(true);
	});

	it('defaults optional string fields to empty string when absent', () => {
		const result = personDtoSchema.parse(VALID_PERSON);
		expect(result.global_suspension_reason).toBe('');
		expect(result.globally_suspended_at).toBe('');
		expect(result.anonymised_at).toBe('');
	});

	it('rejects a PersonDto missing required created_at', () => {
		const { created_at: _createdAt, ...withoutDate } = VALID_PERSON;
		expect(personDtoSchema.safeParse(withoutDate).success).toBe(false);
	});

	it('rejects a PersonDto with non-boolean is_active', () => {
		expect(personDtoSchema.safeParse({ ...VALID_PERSON, is_active: 'yes' }).success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// listPersonMembershipsResponseSchema
// ---------------------------------------------------------------------------

describe('listPersonMembershipsResponseSchema', () => {
	it('parses a response with one membership', () => {
		const result = listPersonMembershipsResponseSchema.safeParse({ memberships: [VALID_USER_DTO] });
		expect(result.success).toBe(true);
	});

	it('parses a response with an empty memberships array', () => {
		const result = listPersonMembershipsResponseSchema.safeParse({ memberships: [] });
		expect(result.success).toBe(true);
	});

	it('rejects a response missing the memberships key', () => {
		expect(listPersonMembershipsResponseSchema.safeParse({}).success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// globalSuspendRequestSchema
// ---------------------------------------------------------------------------

describe('globalSuspendRequestSchema', () => {
	it('accepts a valid reason', () => {
		expect(globalSuspendRequestSchema.safeParse({ reason: 'Abuse of platform' }).success).toBe(
			true
		);
	});

	it('rejects an empty reason (min 1)', () => {
		expect(globalSuspendRequestSchema.safeParse({ reason: '' }).success).toBe(false);
	});

	it('rejects a reason longer than 500 characters', () => {
		expect(globalSuspendRequestSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
	});

	it('rejects extra fields (strict mode)', () => {
		expect(
			globalSuspendRequestSchema.safeParse({ reason: 'Valid reason', extra: true }).success
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// updatePersonProfileRequestSchema
// ---------------------------------------------------------------------------

describe('updatePersonProfileRequestSchema', () => {
	it('accepts valid first_name and last_name', () => {
		expect(
			updatePersonProfileRequestSchema.safeParse({ first_name: 'Raj', last_name: 'Verma' }).success
		).toBe(true);
	});

	it('rejects empty first_name (min 1)', () => {
		expect(
			updatePersonProfileRequestSchema.safeParse({ first_name: '', last_name: 'Verma' }).success
		).toBe(false);
	});

	it('rejects empty last_name (min 1)', () => {
		expect(
			updatePersonProfileRequestSchema.safeParse({ first_name: 'Raj', last_name: '' }).success
		).toBe(false);
	});

	it('rejects first_name longer than 120 characters', () => {
		expect(
			updatePersonProfileRequestSchema.safeParse({
				first_name: 'R'.repeat(121),
				last_name: 'Verma'
			}).success
		).toBe(false);
	});

	it('rejects extra fields (strict mode)', () => {
		expect(
			updatePersonProfileRequestSchema.safeParse({
				first_name: 'Raj',
				last_name: 'Verma',
				email: 'sneaky@acme.test'
			}).success
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// anonymisePersonRequestSchema
// ---------------------------------------------------------------------------

describe('anonymisePersonRequestSchema', () => {
	it('accepts a valid reason', () => {
		expect(
			anonymisePersonRequestSchema.safeParse({ reason: 'DPDP deletion request' }).success
		).toBe(true);
	});

	it('rejects an empty reason (min 1)', () => {
		expect(anonymisePersonRequestSchema.safeParse({ reason: '' }).success).toBe(false);
	});

	it('rejects a reason longer than 500 characters', () => {
		expect(anonymisePersonRequestSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
	});

	it('rejects extra fields (strict mode)', () => {
		expect(
			anonymisePersonRequestSchema.safeParse({ reason: 'DPDP request', confirmed: true }).success
		).toBe(false);
	});
});
