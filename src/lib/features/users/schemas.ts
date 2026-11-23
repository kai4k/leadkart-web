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
	ReplaceUserPermissionOverridesRequest,
	SearchMembersResponse
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

/** GET /v1/users/search — the member picker: `membership_id`, `display_name`, `designation` only. */
export const searchMembersResponseSchema = SearchMembersResponse;
export type SearchMembersResponseDto = z.output<typeof searchMembersResponseSchema>;

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
