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

/**
 * Membership search result — the lightweight shape returned by
 * `GET /v1/identity/memberships?q=…` (typeahead surfacing for
 * reassignment pickers). Backend endpoint is planned but not yet
 * shipped; the schema mirrors the documented contract so the frontend
 * is wire-compatible the moment the endpoint lands.
 */
export const membershipSearchResultSchema = z.object({
	id: z.string(),
	person_id: z.string(),
	first_name: z.string(),
	last_name: z.string(),
	email: z.string().email()
});

export const searchMembershipsResponseSchema = z.object({
	memberships: z.array(membershipSearchResultSchema)
});

export type MembershipSearchResult = z.output<typeof membershipSearchResultSchema>;
export type SearchMembershipsResponse = z.output<typeof searchMembershipsResponseSchema>;

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

export { roleDtoSchema, listRolesResponseSchema } from '$lib/features/roles/schemas';
