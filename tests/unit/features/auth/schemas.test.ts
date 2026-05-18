/**
 * Boundary tests for the auth feature Zod schemas. The login /
 * refresh schemas are exercised end-to-end via the SigninForm happy
 * path; this file covers the authenticated change-password input
 * which has no e2e coverage today.
 */
import { describe, expect, it } from 'vitest';
import {
	changePasswordSchema,
	userDtoSchema,
	sessionDtoSchema,
	listSessionsResponseSchema,
	updateProfileRequestSchema
} from '$lib/features/auth/schemas';

describe('userDtoSchema', () => {
	it('parses a well-formed UserDto', () => {
		const raw = {
			membership_id: 'mem_1',
			person_id: 'per_1',
			tenant_id: 'ten_1',
			email: 'a@b.com',
			first_name: 'Ada',
			last_name: 'Lovelace',
			status: 'active',
			designation: 'Engineer',
			department: 'Platform',
			status_message: '',
			joined_at: '2026-01-01T00:00:00Z',
			left_at: null,
			reports_to: null,
			role_ids: ['rol_1']
		};
		const parsed = userDtoSchema.parse(raw);
		expect(parsed.email).toBe('a@b.com');
		expect(parsed.role_ids).toEqual(['rol_1']);
	});

	it('rejects status outside enum', () => {
		expect(() =>
			userDtoSchema.parse({
				membership_id: 'm',
				person_id: 'p',
				tenant_id: 't',
				email: 'a@b.com',
				first_name: 'A',
				last_name: 'B',
				status: 'banned',
				designation: '',
				department: '',
				status_message: '',
				joined_at: '2026-01-01T00:00:00Z',
				left_at: null,
				reports_to: null,
				role_ids: []
			})
		).toThrow();
	});
});

describe('sessionDtoSchema', () => {
	it('parses a SessionDto', () => {
		const raw = {
			family_id: 'fam_1',
			tenant_id: 'ten_1',
			device_label: 'Chrome on macOS',
			created_at: '2026-05-10T12:00:00Z',
			last_used_at: '2026-05-18T09:00:00Z'
		};
		expect(sessionDtoSchema.parse(raw).family_id).toBe('fam_1');
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
		const parsed = updateProfileRequestSchema.parse(raw);
		expect('first_name' in parsed).toBe(false);
	});
});

describe('changePasswordSchema', () => {
	it('accepts non-empty current + 8+ char new', () => {
		expect(
			changePasswordSchema.safeParse({
				current_password: 'whatever',
				new_password: 'Stronger1!'
			}).success
		).toBe(true);
	});

	it('rejects blank current or sub-8 new', () => {
		expect(
			changePasswordSchema.safeParse({ current_password: '', new_password: 'Stronger1!' }).success
		).toBe(false);
		expect(
			changePasswordSchema.safeParse({ current_password: 'old', new_password: 'short' }).success
		).toBe(false);
	});
});
