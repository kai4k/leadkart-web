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
import {
	AssignUserManagerRequest,
	AssignUserRoleRequest,
	CreateUserRequest,
	CreateUserResponse,
	DeactivateUserRequest,
	ListUsersResponse,
	ReplaceUserPermissionOverridesRequest
} from '#lib/api/generated/index.ts';
import {
	formEmailField,
	newPasswordField,
	personNameField,
	reasonField
} from '#lib/api/request-schema.ts';
import { userDtoSchema } from '#lib/features/auth/schemas.ts';

export { userDtoSchema };

export const listUsersResponseSchema = ListUsersResponse.extend({ users: z.array(userDtoSchema) });

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
	email: z.string()
});

export const searchMembershipsResponseSchema = z.object({
	memberships: z.array(membershipSearchResultSchema)
});

export type MembershipSearchResult = z.output<typeof membershipSearchResultSchema>;
export type SearchMembershipsResponse = z.output<typeof searchMembershipsResponseSchema>;

export const createUserRequestSchema = CreateUserRequest.extend({
	email: formEmailField,
	first_name: personNameField,
	last_name: personNameField,
	password: newPasswordField
}).strict();

export const createUserResponseSchema = CreateUserResponse;

export const deactivateUserRequestSchema = DeactivateUserRequest.extend({
	reason: reasonField
}).strict();

export const assignUserRoleRequestSchema = AssignUserRoleRequest.strict();

export const replacePermissionOverridesRequestSchema = ReplaceUserPermissionOverridesRequest.extend(
	{
		granted: z.array(z.string()),
		revoked: z.array(z.string())
	}
).strict();

export const assignManagerRequestSchema = AssignUserManagerRequest.strict();
