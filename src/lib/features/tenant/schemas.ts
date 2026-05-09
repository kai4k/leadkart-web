import { z } from 'zod';

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

export const adminAddressSchema = z.object({
	street: z.string().optional(),
	city: z.string().optional(),
	district: z.string().optional(),
	state: z.string().optional(),
	state_code: z.string().optional(),
	pincode: z.string().optional()
});

export const passwordPolicySchema = z.object({
	min_length: z.number().int().nonnegative(),
	require_uppercase: z.boolean(),
	require_lowercase: z.boolean(),
	require_digit: z.boolean(),
	require_symbol: z.boolean(),
	max_failed_attempts: z.number().int().nonnegative(),
	lockout_minutes: z.number().int().nonnegative()
});

export const tenantSchema = z.object({
	id: z.string(),
	slug: z.string(),
	legal_name: z.string(),
	display_name: z.string(),
	admin_email: z.string(),
	status: z.string(),
	created_at: z.string(),
	activated_at: z.string().optional(),
	suspended_at: z.string().optional(),
	deletion_scheduled_at: z.string().optional(),
	deletion_reason: z.string().optional(),
	gst_number: z.string().optional(),
	pan_number: z.string().optional(),
	drug_licence_number: z.string().optional(),
	admin_phone: z.string().optional(),
	admin_address: adminAddressSchema,
	password_policy: passwordPolicySchema,
	locale: z.string().optional(),
	time_zone: z.string().optional(),
	date_format: z.string().optional(),
	currency: z.string().optional()
});

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

/**
 * Tenant onboarding (POST /v1/tenants).
 *
 * Slug rules mirror leadkart-go `internal/common/slug/slug.go`: 3-50
 * chars, lowercase alphanumeric + dashes, no leading/trailing dash,
 * no consecutive dashes. The server re-validates; this is the
 * fast-feedback layer.
 *
 * Password rules are intentionally loose at the schema layer: the
 * server enforces the per-tenant policy at boot (PasswordPolicy
 * defaults from migration 20260507000005). 12-char min is the OWASP
 * 2025 floor — anything shorter the server will reject anyway.
 */
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;
const noConsecutiveDashes = /^(?!.*--)/;

export const registerTenantSchema = z.object({
	slug: z
		.string()
		.min(3, 'Slug must be at least 3 characters')
		.max(50, 'Slug must be 50 characters or fewer')
		.regex(slugPattern, 'Lowercase letters, numbers, and dashes only')
		.regex(noConsecutiveDashes, 'Slug cannot contain consecutive dashes'),
	legal_name: z
		.string()
		.min(1, 'Legal name is required')
		.max(200, 'Legal name must be 200 characters or fewer'),
	display_name: z
		.string()
		.min(1, 'Display name is required')
		.max(100, 'Display name must be 100 characters or fewer'),
	admin_email: z
		.string()
		.min(1, 'Email is required')
		.email('Invalid email format')
		.max(254, 'Email is too long'),
	admin_password: z
		.string()
		.min(12, 'Password must be at least 12 characters')
		.max(256, 'Password is too long'),
	admin_first_name: z
		.string()
		.min(1, 'First name is required')
		.max(100, 'First name must be 100 characters or fewer'),
	admin_last_name: z
		.string()
		.min(1, 'Last name is required')
		.max(100, 'Last name must be 100 characters or fewer')
});

export const registerTenantResponseSchema = z.object({
	tenant_id: z.string(),
	person_id: z.string(),
	membership_id: z.string()
});

export type TenantValidated = z.output<typeof tenantSchema>;
export type UpdateTenantProfileInput = z.input<typeof updateTenantProfileSchema>;
export type UpdateTenantStatutoryInput = z.input<typeof updateTenantStatutorySchema>;
export type UpdateTenantAdminContactInput = z.input<typeof updateTenantAdminContactSchema>;
export type UpdateTenantSettingsInput = z.input<typeof updateTenantSettingsSchema>;
export type UpdateTenantDisplayPreferencesInput = z.input<
	typeof updateTenantDisplayPreferencesSchema
>;
export type RegisterTenantInput = z.input<typeof registerTenantSchema>;
export type RegisterTenantValidated = z.output<typeof registerTenantSchema>;
export type RegisterTenantResponseValidated = z.output<typeof registerTenantResponseSchema>;
