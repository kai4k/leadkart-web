import type { z } from 'zod';
import type {
	listUsersResponseSchema,
	createUserRequestSchema,
	createUserResponseSchema,
	deactivateUserRequestSchema,
	assignUserRoleRequestSchema,
	replacePermissionOverridesRequestSchema,
	assignManagerRequestSchema,
	roleDtoSchema,
	listRolesResponseSchema
} from './schemas';

export type { UserDto } from '$lib/features/auth/types';

export type ListUsersResponse = z.output<typeof listUsersResponseSchema>;
export type CreateUserRequest = z.output<typeof createUserRequestSchema>;
export type CreateUserResponse = z.output<typeof createUserResponseSchema>;
export type DeactivateUserRequest = z.output<typeof deactivateUserRequestSchema>;
export type AssignUserRoleRequest = z.output<typeof assignUserRoleRequestSchema>;
export type ReplacePermissionOverridesRequest = z.output<
	typeof replacePermissionOverridesRequestSchema
>;
export type AssignManagerRequest = z.output<typeof assignManagerRequestSchema>;
export type RoleDto = z.output<typeof roleDtoSchema>;
export type ListRolesResponse = z.output<typeof listRolesResponseSchema>;
