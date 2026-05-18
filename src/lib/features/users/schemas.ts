/**
 * Zod schemas for the tenant user-management feature. Parses every
 * backend response at the gateway boundary per CLAUDE.md.
 *
 * UserDto + listUsersResponseSchema reuse the shapes already declared
 * in `lib/features/auth/schemas.ts` (slice 1) — the backend uses the
 * same DTO for both /v1/users (list) and /v1/users/{id} (detail) and
 * for the caller's own profile.
 */
import { z } from 'zod';
import { userDtoSchema } from '$lib/features/auth/schemas';

export { userDtoSchema };

export const listUsersResponseSchema = z.object({
	users: z.array(userDtoSchema)
});

export const createUserRequestSchema = z
	.object({
		email: z.string().email(),
		password: z.string().min(1),
		first_name: z.string().min(1).max(120),
		last_name: z.string().min(1).max(120)
	})
	.strict();

export const createUserResponseSchema = z.object({
	person_id: z.string(),
	membership_id: z.string(),
	person_existed: z.boolean()
});

export const deactivateUserRequestSchema = z
	.object({
		reason: z.string().min(1).max(500)
	})
	.strict();

export const assignUserRoleRequestSchema = z.object({ role_id: z.string() }).strict();

export const replacePermissionOverridesRequestSchema = z
	.object({
		granted: z.array(z.string()),
		revoked: z.array(z.string())
	})
	.strict();

export const assignManagerRequestSchema = z.object({ manager_id: z.string() }).strict();

export const roleDtoSchema = z.object({
	id: z.string(),
	tenant_id: z.string(),
	name: z.string(),
	is_system_default: z.boolean(),
	is_super_admin: z.boolean(),
	hierarchy_level: z.number().int(),
	permissions: z.array(z.string()),
	created_at: z.string(),
	updated_at: z.string()
});

export const listRolesResponseSchema = z.object({ roles: z.array(roleDtoSchema) });
