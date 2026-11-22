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

/** The minimum password length a tenant may require: the contract's own bounds (Go: 8 to 128), never a copy. */
export const PASSWORD_MIN_LENGTH_FLOOR = PasswordPolicyDto.shape.min_length.minValue ?? 8;
export const PASSWORD_MIN_LENGTH_CEILING = PasswordPolicyDto.shape.min_length.maxValue ?? 128;

/**
 * Tenant lifecycle status: the generated enum is Go's own
 * (`pending | active | suspended | pending_deletion | deleted`).
 */
export const tenantStatusSchema = TenantDto.shape.status;
export type TenantStatus = z.output<typeof tenantStatusSchema>;

export const tenantSchema = TenantDto;

export const updateTenantProfileSchema = z.object({
	legal_name: z.string().min(1, 'form.errors.legalNameRequired'),
	display_name: z.string().min(1, 'form.errors.displayNameRequired')
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
