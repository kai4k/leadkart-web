import { api, parseResponse } from '$api/client';
import { listRolesResponseSchema, roleDtoSchema, createRoleResponseSchema } from './schemas';
import type {
	ListRolesResponse,
	RoleDto,
	CreateRoleRequest,
	CreateRoleResponse,
	UpdateRoleRequest,
	ReplaceRolePermissionsRequest,
	RolePermissionRequest
} from './types';

export async function listRoles(): Promise<ListRolesResponse> {
	const raw = await api.get<unknown>('/v1/roles');
	return parseResponse(listRolesResponseSchema, raw);
}

export async function getRole(roleId: string): Promise<RoleDto> {
	const raw = await api.get<unknown>(`/v1/roles/${roleId}`);
	return parseResponse(roleDtoSchema, raw);
}

export async function createRole(req: CreateRoleRequest): Promise<CreateRoleResponse> {
	const raw = await api.post<unknown>('/v1/roles', req);
	return parseResponse(createRoleResponseSchema, raw);
}

export async function updateRole(roleId: string, req: UpdateRoleRequest): Promise<RoleDto> {
	const raw = await api.patch<unknown>(`/v1/roles/${roleId}`, req);
	return parseResponse(roleDtoSchema, raw);
}

export async function replaceRolePermissions(
	roleId: string,
	req: ReplaceRolePermissionsRequest
): Promise<void> {
	await api.put<void>(`/v1/roles/${roleId}/permissions`, req);
}

export async function grantRolePermission(
	roleId: string,
	req: RolePermissionRequest
): Promise<void> {
	await api.post<void>(`/v1/roles/${roleId}/permissions/grant`, req);
}

export async function revokeRolePermission(
	roleId: string,
	req: RolePermissionRequest
): Promise<void> {
	await api.post<void>(`/v1/roles/${roleId}/permissions/revoke`, req);
}

export async function deleteRole(roleId: string): Promise<void> {
	await api.delete<void>(`/v1/roles/${roleId}`);
}
