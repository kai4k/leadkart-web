import type { z } from 'zod';
import type {
	roleDtoSchema,
	listRolesResponseSchema,
	createRoleRequestSchema,
	createRoleResponseSchema,
	updateRoleRequestSchema,
	replaceRolePermissionsRequestSchema,
	rolePermissionRequestSchema
} from './schemas';

export type RoleDto = z.output<typeof roleDtoSchema>;
export type ListRolesResponse = z.output<typeof listRolesResponseSchema>;
export type CreateRoleRequest = z.output<typeof createRoleRequestSchema>;
export type CreateRoleResponse = z.output<typeof createRoleResponseSchema>;
export type UpdateRoleRequest = z.output<typeof updateRoleRequestSchema>;
export type ReplaceRolePermissionsRequest = z.output<typeof replaceRolePermissionsRequestSchema>;
export type RolePermissionRequest = z.output<typeof rolePermissionRequestSchema>;
