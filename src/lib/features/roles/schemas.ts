/**
 * Zod schemas for the tenant role-management feature.
 */
import { z } from 'zod';

export const roleDtoSchema = z.object({
	id: z.string(),
	tenant_id: z.string(),
	name: z.string(),
	is_system_default: z.boolean(),
	is_super_admin: z.boolean(),
	hierarchy_level: z.number().int(),
	permissions: z.array(z.string()),
	created_at: z.string()
});

export const listRolesResponseSchema = z.object({ roles: z.array(roleDtoSchema) });

export const createRoleRequestSchema = z
	.object({
		name: z.string().min(3).max(100),
		hierarchy_level: z.number().int().min(0).max(100)
	})
	.strict();

export const createRoleResponseSchema = z.object({ role_id: z.string() });

export const updateRoleRequestSchema = z
	.object({
		name: z.string().min(3).max(100).optional(),
		hierarchy_level: z.number().int().min(0).max(100).optional()
	})
	.strict();

export const replaceRolePermissionsRequestSchema = z
	.object({ permissions: z.array(z.string()) })
	.strict();

export const rolePermissionRequestSchema = z.object({ permission: z.string() }).strict();
