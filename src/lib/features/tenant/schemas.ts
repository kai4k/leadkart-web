import { z } from 'zod';
import { AdminAddressDto, PasswordPolicyDto, TenantDto } from '#lib/api/generated/index.ts';

/**
 * Tenant feature Zod schemas — used for both API response validation
 * (boundary check) AND client-side form validation (sveltekit-superforms
 * source-of-truth in commits 5+).
 *
 * Shape-level validation only at this layer (Commit 1). Domain-format
 * checks (Indian GST regex, IANA tz, ISO 4217 currency) layer in when
 * the corresponding forms land — putting them here now would tightly
 * couple the gateway to UI concerns the gateway shouldn't own.
 *
 * snake_case field names mirror the leadkart-go wire shape
 * (`internal/identity/ports/dto.go`).
 */

export const adminAddressSchema = AdminAddressDto;

export const passwordPolicySchema = PasswordPolicyDto;

/**
 * Tenant lifecycle status as Go emits it (identity/domain/tenant/status.go).
 * The OpenAPI spec still lists `marked_for_deletion` / `hard_deleted`, which Go
 * never sends — the generated enum is corrected here until the spec is fixed.
 */
export const tenantStatusSchema = z.enum([
	'pending',
	'active',
	'suspended',
	'pending_deletion',
	'deleted'
]);
export type TenantStatus = z.output<typeof tenantStatusSchema>;

export const tenantSchema = TenantDto.extend({ status: tenantStatusSchema });

export const updateTenantProfileSchema = z.object({
	legal_name: z.string().min(1, 'Legal name is required'),
	display_name: z.string().min(1, 'Display name is required')
});

export const updateTenantStatutorySchema = z.object({
	gst_number: z.string(),
	pan_number: z.string(),
	drug_licence_number: z.string()
});

export const updateTenantAdminContactSchema = z.object({
	phone: z.string(),
	address: adminAddressSchema
});

export const updateTenantSettingsSchema = z.object({
	password_policy: passwordPolicySchema
});

export const updateTenantDisplayPreferencesSchema = z.object({
	locale: z.string(),
	time_zone: z.string(),
	date_format: z.string(),
	currency: z.string()
});

export type TenantValidated = z.output<typeof tenantSchema>;
export type UpdateTenantProfileInput = z.input<typeof updateTenantProfileSchema>;
export type UpdateTenantStatutoryInput = z.input<typeof updateTenantStatutorySchema>;
export type UpdateTenantAdminContactInput = z.input<typeof updateTenantAdminContactSchema>;
export type UpdateTenantSettingsInput = z.input<typeof updateTenantSettingsSchema>;
export type UpdateTenantDisplayPreferencesInput = z.input<
	typeof updateTenantDisplayPreferencesSchema
>;
