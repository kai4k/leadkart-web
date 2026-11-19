import { describe, expect, it } from 'vitest';
import {
	listUsersResponseSchema,
	createUserRequestSchema,
	createUserResponseSchema,
	deactivateUserRequestSchema,
	assignUserRoleRequestSchema,
	replacePermissionOverridesRequestSchema,
	assignManagerRequestSchema
} from '#lib/features/users/schemas.ts';

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('listUsersResponseSchema', () => {
	it('parses a list shape', () => {
		expect(listUsersResponseSchema.parse({ users: [], has_more: false }).users).toEqual([]);
	});
});

describe('createUserRequestSchema', () => {
	it('parses + .strict() rejects extras', () => {
		const ok = { email: 'a@b.com', password: 'CorrectHorse-1', first_name: 'A', last_name: 'B' };
		expect(createUserRequestSchema.parse(ok)).toEqual(ok);
		expect(() => createUserRequestSchema.parse({ ...ok, sneaky: 'no' })).toThrow();
	});
	it('rejects invalid email', () => {
		expect(() =>
			createUserRequestSchema.parse({ email: 'no', password: 'x', first_name: 'A', last_name: 'B' })
		).toThrow();
	});
});

describe('createUserResponseSchema', () => {
	it('parses', () => {
		expect(
			createUserResponseSchema.parse({
				person_id: U(1),
				membership_id: U(2),
				person_existed: false
			})
		).toBeTruthy();
	});
});

describe('deactivateUserRequestSchema', () => {
	it('rejects empty reason', () => {
		expect(() => deactivateUserRequestSchema.parse({ reason: '' })).toThrow();
	});
	it('rejects extras (.strict)', () => {
		expect(() => deactivateUserRequestSchema.parse({ reason: 'x', extra: 1 })).toThrow();
	});
});

describe('replacePermissionOverridesRequestSchema', () => {
	it('parses empty arrays', () => {
		expect(
			replacePermissionOverridesRequestSchema.parse({ granted: [], revoked: [] })
		).toBeTruthy();
	});
});

describe('assignUserRoleRequestSchema', () => {
	it('parses role_id', () => {
		expect(assignUserRoleRequestSchema.parse({ role_id: U(3) })).toEqual({ role_id: U(3) });
	});
	it('rejects extras (.strict)', () => {
		expect(() => assignUserRoleRequestSchema.parse({ role_id: U(3), extra: 1 })).toThrow();
	});
});

describe('assignManagerRequestSchema', () => {
	it('parses manager_id', () => {
		expect(assignManagerRequestSchema.parse({ manager_id: U(4) })).toEqual({ manager_id: U(4) });
	});
	it('rejects extras (.strict)', () => {
		expect(() => assignManagerRequestSchema.parse({ manager_id: U(4), extra: 1 })).toThrow();
	});
});
