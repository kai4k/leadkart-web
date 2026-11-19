/**
 * Zod schemas for operator-side tenant management.
 *
 * tenantDtoSchema is re-exported from the existing tenant feature
 * (lib/features/tenant) — the same DTO shape serves both tenant-own
 * settings and operator cross-tenant ops.
 *
 * Note: the tenant feature exports the schema as `tenantSchema`; we
 * re-export it here as `tenantDtoSchema` to match the operator module's
 * naming convention (dto suffix makes the gateway-boundary role explicit).
 */
import { z } from 'zod';
import {
	RegisterTenantRequest,
	SuspendTenantRequest,
	MarkTenantForDeletionRequest,
	RegisterTenantResponse
} from '#lib/api/generated/index.ts';
import { newPasswordField, reasonField } from '#lib/api/request-schema.ts';
import { tenantSchema } from '#lib/features/tenant/schemas.ts';

export { tenantSchema as tenantDtoSchema } from '#lib/features/tenant/schemas.ts';

/**
 * Built from the generated request: its slug / name bounds and the admin e-mail check stand.
 * Added here: no leading/trailing dash in a slug, names must not be empty, the shared password rule.
 */
const registerShape = RegisterTenantRequest.shape;
export const registerTenantRequestSchema = RegisterTenantRequest.extend({
	slug: registerShape.slug.regex(
		/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
		'slug must be lowercase letters, digits, and dashes'
	),
	legal_name: registerShape.legal_name.min(2),
	display_name: registerShape.display_name.min(2),
	admin_password: newPasswordField,
	admin_first_name: registerShape.admin_first_name.min(1).max(120),
	admin_last_name: registerShape.admin_last_name.min(1).max(120)
}).strict();

export const registerTenantResponseSchema = RegisterTenantResponse;

export const suspendTenantRequestSchema = SuspendTenantRequest.extend({
	reason: reasonField
}).strict();

export const markForDeletionRequestSchema = MarkTenantForDeletionRequest.extend({
	reason: reasonField
}).strict();

export const listAllTenantsResponseSchema = z.object({
	tenants: z.array(tenantSchema)
});
