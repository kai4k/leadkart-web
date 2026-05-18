/**
 * Gateway layer for tenant user management. Every response zod-parsed
 * at the boundary per CLAUDE.md. Tenant scope is the caller's JWT
 * tenant_id — no tenant_id parameter on any call.
 */
import { api } from '$api/client';
import {
	listUsersResponseSchema,
	createUserResponseSchema,
	userDtoSchema,
	listRolesResponseSchema
} from './schemas';
import type {
	ListUsersResponse,
	CreateUserRequest,
	CreateUserResponse,
	DeactivateUserRequest,
	AssignUserRoleRequest,
	ReplacePermissionOverridesRequest,
	AssignManagerRequest,
	UserDto,
	RoleDto
} from './types';

export async function listUsers(): Promise<ListUsersResponse> {
	const raw = await api.get<unknown>('/v1/users');
	return listUsersResponseSchema.parse(raw);
}

export async function getUser(membershipId: string): Promise<UserDto> {
	const raw = await api.get<unknown>(`/v1/users/${membershipId}`);
	return userDtoSchema.parse(raw);
}

export async function createUser(req: CreateUserRequest): Promise<CreateUserResponse> {
	const raw = await api.post<unknown>('/v1/users', req);
	return createUserResponseSchema.parse(raw);
}

export async function deactivateUser(
	membershipId: string,
	body: DeactivateUserRequest
): Promise<void> {
	await api.post<void>(`/v1/users/${membershipId}/deactivate`, body);
}

export async function reactivateUser(membershipId: string): Promise<void> {
	await api.post<void>(`/v1/users/${membershipId}/reactivate`);
}

export async function unlockUser(membershipId: string): Promise<void> {
	await api.post<void>(`/v1/users/${membershipId}/unlock`);
}

export async function assignRole(membershipId: string, body: AssignUserRoleRequest): Promise<void> {
	await api.post<void>(`/v1/users/${membershipId}/roles`, body);
}

export async function revokeRole(membershipId: string, roleId: string): Promise<void> {
	await api.delete<void>(`/v1/users/${membershipId}/roles/${roleId}`);
}

export async function replacePermissionOverrides(
	membershipId: string,
	body: ReplacePermissionOverridesRequest
): Promise<void> {
	await api.patch<void>(`/v1/users/${membershipId}/permission-overrides`, body);
}

export async function assignManager(
	membershipId: string,
	body: AssignManagerRequest
): Promise<void> {
	await api.put<void>(`/v1/users/${membershipId}/manager`, body);
}

export async function removeManager(membershipId: string): Promise<void> {
	await api.delete<void>(`/v1/users/${membershipId}/manager`);
}

/**
 * Role catalogue read — used by the role-assignment drawer. Slice 3
 * will own the roles feature; this minimal pass-through is the
 * temporary read.
 */
export async function listRoles(): Promise<RoleDto[]> {
	const raw = await api.get<unknown>('/v1/roles');
	return listRolesResponseSchema.parse(raw).roles;
}
