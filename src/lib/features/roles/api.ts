import { api } from '$api/client';
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

/**
 * Try to parse a 200+body response as RoleDto.
 * Returns the DTO when the server sends one (E4 pattern), undefined for 204.
 */
function parseRoleOrVoid(raw: unknown): RoleDto | void {
	if (raw === null || raw === undefined || raw === '') return;
	const result = roleDtoSchema.safeParse(raw);
	return result.success ? result.data : undefined;
}

export async function listRoles(): Promise<ListRolesResponse> {
	const raw = await api.get<unknown>('/v1/roles');
	return listRolesResponseSchema.parse(raw);
}

export async function getRole(roleId: string): Promise<RoleDto> {
	const raw = await api.get<unknown>(`/v1/roles/${roleId}`);
	return roleDtoSchema.parse(raw);
}

export async function createRole(req: CreateRoleRequest): Promise<CreateRoleResponse> {
	const raw = await api.post<unknown>('/v1/roles', req);
	return createRoleResponseSchema.parse(raw);
}

export async function updateRole(roleId: string, req: UpdateRoleRequest): Promise<RoleDto | void> {
	const raw = await api.patch<unknown>(`/v1/roles/${roleId}`, req);
	return parseRoleOrVoid(raw);
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
