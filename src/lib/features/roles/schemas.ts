/**
 * Zod schemas for the tenant role-management feature.
 */
import { z } from 'zod';
import { humanTextField } from '#lib/api/request-schema.ts';
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

/** Name bounds are the contract's (Go: 2-100); the inputs' minlength / maxlength read these. */
export const ROLE_NAME_MIN = CreateRoleRequest.shape.name.minLength ?? 2;
export const ROLE_NAME_MAX = CreateRoleRequest.shape.name.maxLength ?? 100;

/** The contract allows level 0, but Go rejects it for a created or re-levelled role (the Owner's level). */
const levelField = z
	.number({ error: 'form.errors.levelInvalid' })
	.int('form.errors.levelInvalid')
	.min(ROLE_LEVEL_MIN, 'form.errors.levelOutOfRange')
	.max(ROLE_LEVEL_MAX, 'form.errors.levelOutOfRange');

/** The same bounds as the contract's name; only the messages are ours. */
const nameField = humanTextField({
	min: ROLE_NAME_MIN,
	maxBytes: ROLE_NAME_MAX,
	requiredMessage: 'form.errors.roleNameTooShort',
	tooShortMessage: 'form.errors.roleNameTooShort',
	tooLongMessage: 'form.errors.roleNameTooLong'
});

export const createRoleRequestSchema = CreateRoleRequest.extend({
	name: nameField,
	hierarchy_level: levelField
}).strict();

export const createRoleResponseSchema = CreateRoleResponse;

export const updateRoleRequestSchema = UpdateRoleRequest.extend({
	name: nameField.optional(),
	hierarchy_level: levelField.nullable().optional()
}).strict();

export const replaceRolePermissionsRequestSchema = ReplaceRolePermissionsRequest.strict();

export const rolePermissionRequestSchema = RolePermissionRequest.strict();
