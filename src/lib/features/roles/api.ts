import { api } from '#lib/api/client.ts';
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

export function listRoles(signal?: AbortSignal): Promise<ListRolesResponse> {
	return api.get('/v1/roles', listRolesResponseSchema, { signal });
}

export function getRole(roleId: string, signal?: AbortSignal): Promise<RoleDto> {
	return api.get(`/v1/roles/${roleId}`, roleDtoSchema, { signal });
}

export function createRole(req: CreateRoleRequest): Promise<CreateRoleResponse> {
	return api.postJson('/v1/roles', req, createRoleResponseSchema);
}

/** PATCH /v1/roles/{id} answers 204 (roles_http.go:182). */
export async function updateRole(roleId: string, req: UpdateRoleRequest): Promise<void> {
	await api.patch(`/v1/roles/${roleId}`, req);
}

export async function replaceRolePermissions(
	roleId: string,
	req: ReplaceRolePermissionsRequest
): Promise<void> {
	await api.put(`/v1/roles/${roleId}/permissions`, req);
}

export async function grantRolePermission(
	roleId: string,
	req: RolePermissionRequest
): Promise<void> {
	await api.post(`/v1/roles/${roleId}/permissions/grant`, req);
}

export async function revokeRolePermission(
	roleId: string,
	req: RolePermissionRequest
): Promise<void> {
	await api.post(`/v1/roles/${roleId}/permissions/revoke`, req);
}

export async function deleteRole(roleId: string): Promise<void> {
	await api.delete(`/v1/roles/${roleId}`);
}

/**
 * Set or clear the role's parent (single-parent organisational hierarchy,
 * ADR 0054). Pass `parent_role_id: null` to detach. 204 (roles_http.go:143).
 *
 * Server-enforced invariants:
 *   - No cycles
 *   - parent must be in the same tenant
 *   - Protected roles (super_admin, system_default) cannot be parented
 */
export async function setRoleParent(
	roleId: string,
	body: { parent_role_id: string | null }
): Promise<void> {
	await api.patch(`/v1/roles/${roleId}/parent`, body);
}
