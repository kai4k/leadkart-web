/**
 * Boundary tests for the auth feature Zod schemas. The login /
 * refresh schemas are exercised end-to-end via the SigninForm happy
 * path; this file covers the authenticated change-password input
 * which has no e2e coverage today.
 */
import { describe, expect, it } from 'vitest';
import {
	capabilitiesSchema,
	changePasswordSchema,
	userDtoSchema,
	sessionDtoSchema,
	listSessionsResponseSchema,
	updateProfileRequestSchema
} from '#lib/features/auth/schemas.ts';

const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('userDtoSchema', () => {
	it('parses a well-formed UserDto', () => {
		const raw = {
			membership_id: UUID(1),
			person_id: UUID(2),
			tenant_id: UUID(3),
			email: 'a@b.com',
			first_name: 'Ada',
			last_name: 'Lovelace',
			status: 'active',
			designation: 'Engineer',
			department: 'Platform',
			status_message: '',
			joined_at: '2026-01-01T00:00:00Z',
			role_ids: [UUID(5)]
		};
		const parsed = userDtoSchema.parse(raw);
		expect(parsed.email).toBe('a@b.com');
		expect(parsed.role_ids).toEqual([UUID(5)]);
	});

	it('rejects status outside enum', () => {
		expect(() =>
			userDtoSchema.parse({
				membership_id: UUID(1),
				person_id: UUID(2),
				tenant_id: UUID(3),
				email: 'a@b.com',
				first_name: 'A',
				last_name: 'B',
				status: 'banned',
				designation: '',
				department: '',
				status_message: '',
				joined_at: '2026-01-01T00:00:00Z',
				role_ids: []
			})
		).toThrow();
	});
});

describe('sessionDtoSchema', () => {
	it('parses a SessionDto', () => {
		const raw = {
			family_id: UUID(4),
			tenant_id: UUID(3),
			device_label: 'Chrome on macOS',
			created_at: '2026-05-10T12:00:00Z',
			last_used_at: '2026-05-18T09:00:00Z'
		};
		expect(sessionDtoSchema.parse(raw).family_id).toBe(UUID(4));
	});
});

describe('listSessionsResponseSchema', () => {
	it('parses an array of sessions', () => {
		const raw = { sessions: [] };
		expect(listSessionsResponseSchema.parse(raw).sessions).toEqual([]);
	});
});

describe('updateProfileRequestSchema', () => {
	it('rejects extra fields (first_name not editable here)', () => {
		const raw = { designation: 'X', department: 'Y', status_message: '', first_name: 'illegal' };
		expect(() => updateProfileRequestSchema.parse(raw)).toThrow();
	});

	it('parses a well-formed request', () => {
		const raw = {
			designation: 'Engineer',
			department: 'Platform',
			status_message: 'Out for lunch'
		};
		const parsed = updateProfileRequestSchema.parse(raw);
		expect(parsed).toEqual(raw);
	});
});

describe('changePasswordSchema', () => {
	it('accepts non-empty current + 12+ char new', () => {
		expect(
			changePasswordSchema.safeParse({
				current_password: 'whatever',
				new_password: 'Stronger-Pass1!'
			}).success
		).toBe(true);
	});

	it('rejects blank current or sub-12 new', () => {
		expect(
			changePasswordSchema.safeParse({ current_password: '', new_password: 'Stronger-Pass1!' })
				.success
		).toBe(false);
		expect(
			changePasswordSchema.safeParse({ current_password: 'old', new_password: 'short' }).success
		).toBe(false);
	});
});

describe('capabilitiesSchema (generated CapabilitiesDto)', () => {
	const base = {
		person_id: UUID(1),
		membership_id: UUID(2),
		tenant_id: UUID(3),
		tenant_slug: 'acme',
		is_platform: false,
		is_super_user: false,
		permissions: [],
		effective_permissions: [],
		roles: [],
		rank: 99,
		tier: 'user'
	};

	it('parses a body without email / first_name / last_name (omitzero in Go)', () => {
		expect(capabilitiesSchema.safeParse(base).success).toBe(true);
	});

	it('still parses when the names are present', () => {
		expect(
			capabilitiesSchema.safeParse({
				...base,
				email: 'a@b.com',
				first_name: 'Ada',
				last_name: 'Lovelace'
			}).success
		).toBe(true);
	});
});

describe('userDtoSchema (generated UserDto)', () => {
	const base = {
		membership_id: UUID(1),
		person_id: UUID(2),
		tenant_id: UUID(3),
		email: 'a@b.com',
		first_name: 'Ada',
		last_name: 'Lovelace',
		status: 'active',
		role_ids: []
	};

	it('accepts a body without joined_at and defaults the profile strings', () => {
		const r = userDtoSchema.safeParse(base);
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.designation).toBe('');
			expect(r.data.department).toBe('');
			expect(r.data.status_message).toBe('');
		}
	});

	it("rejects status 'pending' (Go sends active | inactive)", () => {
		expect(userDtoSchema.safeParse({ ...base, status: 'pending' }).success).toBe(false);
	});
});
