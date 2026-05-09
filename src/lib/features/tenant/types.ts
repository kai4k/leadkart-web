/**
 * Tenant feature types — mirrors the leadkart-go Identity HTTP DTOs in
 * `internal/identity/ports/dto.go` (TenantDto, AdminAddressDto,
 * PasswordPolicyDto + the 5 update-request shapes).
 *
 * snake_case field names preserve wire compatibility — the same
 * convention the auth feature uses (`access_token`, `tenant_id`).
 * Until OpenAPI codegen lands, these are hand-typed against the Go
 * source and pinned by the Zod schemas in `./schemas.ts`.
 */

export interface AdminAddress {
	street?: string;
	city?: string;
	district?: string;
	state?: string;
	state_code?: string;
	pincode?: string;
}

export interface PasswordPolicy {
	min_length: number;
	require_uppercase: boolean;
	require_lowercase: boolean;
	require_digit: boolean;
	require_symbol: boolean;
	max_failed_attempts: number;
	lockout_minutes: number;
}

export type TenantStatus = 'pending' | 'active' | 'suspended' | 'pending_deletion';

export interface Tenant {
	id: string;
	slug: string;
	legal_name: string;
	display_name: string;
	admin_email: string;
	status: string;
	created_at: string;
	activated_at?: string;
	suspended_at?: string;
	deletion_scheduled_at?: string;
	deletion_reason?: string;
	gst_number?: string;
	pan_number?: string;
	drug_licence_number?: string;
	admin_phone?: string;
	admin_address: AdminAddress;
	password_policy: PasswordPolicy;
	locale?: string;
	time_zone?: string;
	date_format?: string;
	currency?: string;
}

export interface UpdateTenantProfileRequest {
	legal_name: string;
	display_name: string;
}

export interface UpdateTenantStatutoryRequest {
	gst_number: string;
	pan_number: string;
	drug_licence_number: string;
}

export interface UpdateTenantAdminContactRequest {
	phone: string;
	address: AdminAddress;
}

export interface UpdateTenantSettingsRequest {
	password_policy: PasswordPolicy;
}

export interface UpdateTenantDisplayPreferencesRequest {
	locale: string;
	time_zone: string;
	date_format: string;
	currency: string;
}

/**
 * POST /v1/tenants — anonymous tenant onboarding. Creates the tenant
 * row + the first admin Person + the first Membership in one
 * transaction (Identity domain `RegisterTenantCommand`).
 *
 * Wire shape mirrors `RegisterTenantRequest` in
 * leadkart-go/internal/identity/ports/dto.go.
 */
export interface RegisterTenantRequest {
	slug: string;
	legal_name: string;
	display_name: string;
	admin_email: string;
	admin_password: string;
	admin_first_name: string;
	admin_last_name: string;
}

export interface RegisterTenantResponse {
	tenant_id: string;
	person_id: string;
	membership_id: string;
}
