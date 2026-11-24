import { seg } from '#lib/utils/path-segment.ts';
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
	return api.get(`/v1/roles/${seg(roleId)}`, roleDtoSchema, { signal });
}

export function createRole(req: CreateRoleRequest): Promise<CreateRoleResponse> {
	return api.postJson('/v1/roles', req, createRoleResponseSchema);
}

/** PATCH /v1/roles/{id} answers 204 (roles_http.go:182). */
export async function updateRole(roleId: string, req: UpdateRoleRequest): Promise<void> {
	await api.patch(`/v1/roles/${seg(roleId)}`, req);
}

export async function replaceRolePermissions(
	roleId: string,
	req: ReplaceRolePermissionsRequest
): Promise<void> {
	await api.put(`/v1/roles/${seg(roleId)}/permissions`, req);
}

export async function grantRolePermission(
	roleId: string,
	req: RolePermissionRequest
): Promise<void> {
	await api.post(`/v1/roles/${seg(roleId)}/permissions/grant`, req);
}

export async function revokeRolePermission(
	roleId: string,
	req: RolePermissionRequest
): Promise<void> {
	await api.post(`/v1/roles/${seg(roleId)}/permissions/revoke`, req);
}

/**
 * "Delete" on screen is `POST /v1/roles/{id}/deactivate` (ADR 0073: roles are never deleted, only made
 * inactive). 200 with the updated role; 409 `role_in_use` while an active member holds it.
 */
export function deactivateRole(roleId: string): Promise<RoleDto> {
	return api.postJson(`/v1/roles/${seg(roleId)}/deactivate`, {}, roleDtoSchema);
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
	await api.patch(`/v1/roles/${seg(roleId)}/parent`, body);
}
