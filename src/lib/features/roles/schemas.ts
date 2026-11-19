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

/** Highest level number (lowest authority): the contract's own bound (Go: level 0-99). */
export const ROLE_LEVEL_MAX = CreateRoleRequest.shape.hierarchy_level.maxValue ?? 99;
/**
 * Lowest level a custom role may take. Level 0 is the system Owner role's, so forms start at 1
 * (the contract's own minimum is 0).
 */
export const ROLE_LEVEL_MIN = Math.max(1, CreateRoleRequest.shape.hierarchy_level.minValue ?? 1);

/** Name / level bounds are the generated ones (Go: name 2-100, level 0-99). */
export const createRoleRequestSchema = CreateRoleRequest.strict();

export const createRoleResponseSchema = CreateRoleResponse;

export const updateRoleRequestSchema = UpdateRoleRequest.strict();

export const replaceRolePermissionsRequestSchema = ReplaceRolePermissionsRequest.strict();

export const rolePermissionRequestSchema = RolePermissionRequest.strict();
