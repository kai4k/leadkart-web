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

describe('listUsersResponseSchema', () => {
	it('parses a list shape', () => {
		expect(listUsersResponseSchema.parse({ users: [] }).users).toEqual([]);
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
			createUserResponseSchema.parse({ person_id: 'p', membership_id: 'm', person_existed: false })
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
		expect(assignUserRoleRequestSchema.parse({ role_id: 'r1' })).toEqual({ role_id: 'r1' });
	});
	it('rejects extras (.strict)', () => {
		expect(() => assignUserRoleRequestSchema.parse({ role_id: 'r1', extra: 1 })).toThrow();
	});
});

describe('assignManagerRequestSchema', () => {
	it('parses manager_id', () => {
		expect(assignManagerRequestSchema.parse({ manager_id: 'm1' })).toEqual({ manager_id: 'm1' });
	});
	it('rejects extras (.strict)', () => {
		expect(() => assignManagerRequestSchema.parse({ manager_id: 'm1', extra: 1 })).toThrow();
	});
});
