/**
 * Boundary-validation tests for operator/tenants Zod schemas.
 *
 * Covers the slug regex (valid + invalid patterns), password minimum,
 * reason minimum, and `.strict()` behaviour on all three request schemas.
 */
import { describe, expect, it } from 'vitest';
import {
	registerTenantRequestSchema,
	registerTenantResponseSchema,
	suspendTenantRequestSchema,
	markForDeletionRequestSchema,
	tenantDtoSchema,
	listAllTenantsResponseSchema
} from '#lib/features/operator/tenants/schemas.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_REGISTER = {
	slug: 'acme-pharma',
	legal_name: 'Acme Pharma Pvt Ltd',
	display_name: 'Acme',
	admin_email: 'admin@acme.test',
	admin_password: 'S3cur3Pass!!x',
	admin_first_name: 'Raj',
	admin_last_name: 'Verma'
};

// ---------------------------------------------------------------------------
// registerTenantRequestSchema — slug regex
// ---------------------------------------------------------------------------

describe('registerTenantRequestSchema — slug', () => {
	it('accepts a valid lowercase-with-dashes slug', () => {
		expect(registerTenantRequestSchema.safeParse(VALID_REGISTER).success).toBe(true);
	});

	it('accepts a single-word all-lowercase slug', () => {
		expect(registerTenantRequestSchema.safeParse({ ...VALID_REGISTER, slug: 'abc' }).success).toBe(
			true
		);
	});

	it('accepts slug with digits', () => {
		expect(registerTenantRequestSchema.safeParse({ ...VALID_REGISTER, slug: 'ac3m' }).success).toBe(
			true
		);
	});

	it('rejects slug with uppercase letters', () => {
		expect(
			registerTenantRequestSchema.safeParse({ ...VALID_REGISTER, slug: 'Acme-Pharma' }).success
		).toBe(false);
	});

	it('rejects slug starting with a dash', () => {
		expect(
			registerTenantRequestSchema.safeParse({ ...VALID_REGISTER, slug: '-acme' }).success
		).toBe(false);
	});

	it('rejects slug ending with a dash', () => {
		expect(
			registerTenantRequestSchema.safeParse({ ...VALID_REGISTER, slug: 'acme-' }).success
		).toBe(false);
	});

	it('rejects slug with spaces', () => {
		expect(
			registerTenantRequestSchema.safeParse({ ...VALID_REGISTER, slug: 'acme pharma' }).success
		).toBe(false);
	});

	it('follows the contract bounds: 2 to 100 characters', () => {
		const parse = (slug: string) =>
			registerTenantRequestSchema.safeParse({ ...VALID_REGISTER, slug }).success;
		expect(parse('a')).toBe(false);
		expect(parse('ab')).toBe(true);
		expect(parse('a'.repeat(100))).toBe(true);
		expect(parse('a'.repeat(101))).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// registerTenantRequestSchema — password + strict
// ---------------------------------------------------------------------------

describe('registerTenantRequestSchema — password + strict', () => {
	// Go's policy (openapi at 166b6e7: `admin_password` min 8; BFF_API_CHANGES row 26): 8 characters, not 12. The classes
	// (upper, lower, digit, symbol) are the tenant's policy: Go answers `password_policy_violation`, never stricter here.
	it('uses the shared password rule: 8 characters (a password of 8-11 is accepted)', () => {
		const parse = (admin_password: string) =>
			registerTenantRequestSchema.safeParse({ ...VALID_REGISTER, admin_password }).success;
		expect(parse('1234567')).toBe(false);
		expect(parse('Abcdef1!')).toBe(true);
		expect(parse('a'.repeat(11))).toBe(true);
		expect(parse('a'.repeat(12))).toBe(true);
	});

	it('rejects extra fields (strict mode)', () => {
		expect(
			registerTenantRequestSchema.safeParse({ ...VALID_REGISTER, unknown_field: 'x' }).success
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// suspendTenantRequestSchema
// ---------------------------------------------------------------------------

describe('suspendTenantRequestSchema', () => {
	it('accepts a valid reason', () => {
		expect(suspendTenantRequestSchema.safeParse({ reason: 'Policy violation' }).success).toBe(true);
	});

	it('rejects empty reason', () => {
		expect(suspendTenantRequestSchema.safeParse({ reason: '' }).success).toBe(false);
	});

	it('rejects reason longer than 500 characters', () => {
		expect(suspendTenantRequestSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
	});

	it('rejects extra fields (strict mode)', () => {
		expect(
			suspendTenantRequestSchema.safeParse({ reason: 'Valid reason', extra: true }).success
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// markForDeletionRequestSchema
// ---------------------------------------------------------------------------

describe('markForDeletionRequestSchema', () => {
	it('accepts a valid reason', () => {
		expect(
			markForDeletionRequestSchema.safeParse({ reason: 'Tenant requested account closure' }).success
		).toBe(true);
	});

	it('rejects empty reason', () => {
		expect(markForDeletionRequestSchema.safeParse({ reason: '' }).success).toBe(false);
	});

	it('rejects extra fields (strict mode)', () => {
		expect(markForDeletionRequestSchema.safeParse({ reason: 'Valid', extra: 'oops' }).success).toBe(
			false
		);
	});
});

// ---------------------------------------------------------------------------
// registerTenantResponseSchema
// ---------------------------------------------------------------------------

describe('registerTenantResponseSchema', () => {
	it('parses a valid 201 response', () => {
		const result = registerTenantResponseSchema.safeParse({
			tenant_id: '00000000-0000-4000-8000-000000000003',
			person_id: '00000000-0000-4000-8000-000000000001',
			membership_id: '00000000-0000-4000-8000-000000000002'
		});
		expect(result.success).toBe(true);
	});

	it('rejects a response missing membership_id', () => {
		expect(
			registerTenantResponseSchema.safeParse({
				tenant_id: '00000000-0000-4000-8000-000000000003',
				person_id: '00000000-0000-4000-8000-000000000001'
			}).success
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// tenantDtoSchema re-export
// ---------------------------------------------------------------------------

describe('tenantDtoSchema re-export', () => {
	it('is the same schema as the tenant feature tenantSchema (parses a valid DTO)', () => {
		const result = tenantDtoSchema.safeParse({
			id: '00000000-0000-4000-8000-000000000003',
			slug: 'acme',
			legal_name: 'Acme Ltd',
			display_name: 'Acme',
			admin_email: 'a@acme.test',
			status: 'active',
			created_at: '2026-01-01T00:00:00Z',
			admin_address: {},
			password_policy: {
				min_length: 8,
				require_uppercase: false,
				require_lowercase: false,
				require_digit: false,
				require_symbol: false,
				max_failed_attempts: 5,
				lockout_minutes: 15
			}
		});
		expect(result.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// listAllTenantsResponseSchema
// ---------------------------------------------------------------------------

const VALID_TENANT_DTO = {
	id: '00000000-0000-4000-8000-000000000003',
	slug: 'acme',
	legal_name: 'Acme Ltd',
	display_name: 'Acme',
	admin_email: 'a@acme.test',
	status: 'active',
	created_at: '2026-01-01T00:00:00Z',
	admin_address: {},
	password_policy: {
		min_length: 8,
		require_uppercase: false,
		require_lowercase: false,
		require_digit: false,
		require_symbol: false,
		max_failed_attempts: 5,
		lockout_minutes: 15
	}
};

describe('listAllTenantsResponseSchema', () => {
	it('parses a response with an empty tenants array', () => {
		expect(listAllTenantsResponseSchema.safeParse({ tenants: [] }).success).toBe(true);
	});

	it('parses a response with one valid tenant DTO', () => {
		expect(listAllTenantsResponseSchema.safeParse({ tenants: [VALID_TENANT_DTO] }).success).toBe(
			true
		);
	});

	it('rejects a response missing the tenants field', () => {
		expect(listAllTenantsResponseSchema.safeParse({}).success).toBe(false);
	});

	it('rejects a response where tenants is not an array', () => {
		expect(listAllTenantsResponseSchema.safeParse({ tenants: null }).success).toBe(false);
	});
});
