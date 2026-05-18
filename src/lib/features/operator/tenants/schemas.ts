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

export { tenantSchema as tenantDtoSchema } from '$lib/features/tenant/schemas';

export const registerTenantRequestSchema = z
	.object({
		slug: z
			.string()
			.min(3)
			.max(60)
			.regex(
				/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
				'slug must be lowercase letters, digits, and dashes'
			),
		legal_name: z.string().min(2).max(200),
		display_name: z.string().min(2).max(200),
		admin_email: z.string().email(),
		admin_password: z.string().min(8).max(200),
		admin_first_name: z.string().min(1).max(120),
		admin_last_name: z.string().min(1).max(120)
	})
	.strict();

export const registerTenantResponseSchema = z.object({
	tenant_id: z.string(),
	person_id: z.string(),
	membership_id: z.string()
});

export const suspendTenantRequestSchema = z.object({ reason: z.string().min(1).max(500) }).strict();

export const markForDeletionRequestSchema = z
	.object({ reason: z.string().min(1).max(500) })
	.strict();

export const listAllTenantsResponseSchema = z.object({
	tenants: z.array(tenantDtoSchema)
});
