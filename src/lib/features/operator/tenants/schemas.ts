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
import { formEmailField, newPasswordField, reasonField } from '#lib/api/request-schema.ts';
import { tenantSchema } from '#lib/features/tenant/schemas.ts';

export { tenantSchema as tenantDtoSchema } from '#lib/features/tenant/schemas.ts';

/**
 * Built from the generated request: its slug / name bounds stand.
 * Added here: the shared e-mail rule, no leading/trailing dash in a slug, names must not be empty, the shared password rule.
 */
export const registerTenantRequestSchema = RegisterTenantRequest.extend({
	// The contract's bounds (2-100); only the messages are ours.
	slug: z
		.string()
		.min(2, 'form.errors.slugLength')
		.max(100, 'form.errors.slugLength')
		.regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'form.errors.slugCharacters'),
	legal_name: z.string().min(2, 'form.required').max(200, 'form.tooLong'),
	display_name: z.string().min(2, 'form.required').max(200, 'form.tooLong'),
	admin_email: formEmailField,
	admin_password: newPasswordField,
	admin_first_name: z.string().min(1, 'form.required').max(120, 'form.tooLong'),
	admin_last_name: z.string().min(1, 'form.required').max(120, 'form.tooLong')
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
