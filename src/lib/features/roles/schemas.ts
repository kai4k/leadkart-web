/**
 * Zod schemas for the tenant role-management feature.
 */
import {
	CreateRoleRequest,
	CreateRoleResponse,
	ListRolesResponse,
	ReplaceRolePermissionsRequest,
	RoleDto,
	RolePermissionRequest,
	UpdateRoleRequest
} from '#lib/api/generated/index.ts';

export const roleDtoSchema = RoleDto;

export const listRolesResponseSchema = ListRolesResponse;

/** Name / level bounds are the generated ones (Go: name 2-100, level 0-99). */
export const createRoleRequestSchema = CreateRoleRequest.strict();

export const createRoleResponseSchema = CreateRoleResponse;

export const updateRoleRequestSchema = UpdateRoleRequest.strict();

export const replaceRolePermissionsRequestSchema = ReplaceRolePermissionsRequest.strict();

export const rolePermissionRequestSchema = RolePermissionRequest.strict();
