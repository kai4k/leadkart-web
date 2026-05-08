/**
 * Boundary-validation tests for the tenant feature Zod schemas.
 *
 * The fixtures here mirror the leadkart-go `TenantDto` JSON encoding
 * (snake_case + RFC 3339 timestamps). If the backend renames a field
 * or shifts a type, parse fails here — which is the whole point of
 * gateway-boundary validation per Stripe SDK / tRPC canon.
 */
import { describe, expect, it } from 'vitest';
import {
	tenantSchema,
	updateTenantAdminContactSchema,
	updateTenantDisplayPreferencesSchema,
	updateTenantProfileSchema,
	updateTenantSettingsSchema,
	updateTenantStatutorySchema
} from '$lib/features/tenant/schemas';

const FULL_TENANT = {
	id: '00000000-0000-0000-0000-000000000001',
	slug: 'acme-pharma',
	legal_name: 'Acme Pharma Pvt Ltd',
	display_name: 'Acme',
	admin_email: 'admin@acme.test',
	status: 'active',
	created_at: '2026-01-15T10:30:00Z',
	activated_at: '2026-01-16T09:00:00Z',
	gst_number: '27AAAPL1234C1Z1',
	pan_number: 'AAAPL1234C',
	drug_licence_number: 'MH-DL-0123/24',
	admin_phone: '+919999900000',
	admin_address: {
		street: '12 Pharma Park',
		city: 'Mumbai',
		district: 'Mumbai Suburban',
		state: 'Maharashtra',
		state_code: '27',
		pincode: '400076'
	},
	password_policy: {
		min_length: 12,
		require_uppercase: true,
		require_lowercase: true,
		require_digit: true,
		require_symbol: false,
		max_failed_attempts: 5,
		lockout_minutes: 15
	},
	locale: 'en-IN',
	time_zone: 'Asia/Kolkata',
	date_format: 'dd-MM-yyyy',
	currency: 'INR'
};

describe('tenantSchema', () => {
	it('parses a fully-populated tenant response', () => {
		const parsed = tenantSchema.parse(FULL_TENANT);
		expect(parsed.id).toBe('00000000-0000-0000-0000-000000000001');
		expect(parsed.password_policy.min_length).toBe(12);
		expect(parsed.admin_address.pincode).toBe('400076');
		expect(parsed.locale).toBe('en-IN');
	});

	it('parses a freshly-onboarded tenant with empty optional fields omitted', () => {
		const minimal = {
			id: '00000000-0000-0000-0000-000000000002',
			slug: 'newco',
			legal_name: 'NewCo',
			display_name: 'NewCo',
			admin_email: 'admin@newco.test',
			status: 'pending',
			created_at: '2026-05-08T08:00:00Z',
			admin_address: {},
			password_policy: {
				min_length: 8,
				require_uppercase: false,
				require_lowercase: false,
				require_digit: false,
				require_symbol: false,
				max_failed_attempts: 5,
				lockout_minutes: 15
			}
		};
		const parsed = tenantSchema.parse(minimal);
		expect(parsed.gst_number).toBeUndefined();
		expect(parsed.activated_at).toBeUndefined();
		expect(parsed.admin_address.city).toBeUndefined();
	});

	it('rejects a response missing admin_address', () => {
		const bad: Record<string, unknown> = { ...FULL_TENANT };
		delete bad.admin_address;
		const result = tenantSchema.safeParse(bad);
		expect(result.success).toBe(false);
	});

	it('rejects a response with non-numeric password_policy.min_length', () => {
		const bad = {
			...FULL_TENANT,
			password_policy: { ...FULL_TENANT.password_policy, min_length: 'twelve' }
		};
		const result = tenantSchema.safeParse(bad);
		expect(result.success).toBe(false);
	});
});

describe('update-request schemas', () => {
	it('updateTenantProfileSchema requires non-empty legal_name and display_name', () => {
		expect(updateTenantProfileSchema.safeParse({ legal_name: '', display_name: '' }).success).toBe(
			false
		);
		expect(
			updateTenantProfileSchema.safeParse({ legal_name: 'A', display_name: 'B' }).success
		).toBe(true);
	});

	it('updateTenantStatutorySchema accepts empty strings (clears the field server-side)', () => {
		const result = updateTenantStatutorySchema.safeParse({
			gst_number: '',
			pan_number: '',
			drug_licence_number: ''
		});
		expect(result.success).toBe(true);
	});

	it('updateTenantAdminContactSchema requires the address object even when empty', () => {
		expect(updateTenantAdminContactSchema.safeParse({ phone: '' }).success).toBe(false);
		expect(updateTenantAdminContactSchema.safeParse({ phone: '+91999', address: {} }).success).toBe(
			true
		);
	});

	it('updateTenantSettingsSchema validates the password_policy slice', () => {
		expect(
			updateTenantSettingsSchema.safeParse({
				password_policy: {
					min_length: 8,
					require_uppercase: false,
					require_lowercase: true,
					require_digit: true,
					require_symbol: false,
					max_failed_attempts: 5,
					lockout_minutes: 15
				}
			}).success
		).toBe(true);
		expect(
			updateTenantSettingsSchema.safeParse({
				password_policy: { min_length: -1 } // missing booleans + negative length
			}).success
		).toBe(false);
	});

	it('updateTenantDisplayPreferencesSchema accepts the v0.3 IST-INR defaults', () => {
		const result = updateTenantDisplayPreferencesSchema.safeParse({
			locale: 'en-IN',
			time_zone: 'Asia/Kolkata',
			date_format: 'dd-MM-yyyy',
			currency: 'INR'
		});
		expect(result.success).toBe(true);
	});
});
