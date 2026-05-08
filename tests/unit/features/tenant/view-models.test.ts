/**
 * Pure-function tests for the tenant view-models. No mocks, no async,
 * no fixtures with side-effects — view-models are deterministic
 * Tenant-DTO → display-shape transforms, so each input/output pair is
 * a small input table.
 */
import { describe, expect, it } from 'vitest';
import {
	formattedAddressLines,
	formattedPhone,
	formattedPincode,
	tenantDisplayName,
	tenantStatusBadge
} from '$lib/features/tenant/view-models';
import type { Tenant } from '$lib/features/tenant/types';

const BASE_TENANT: Tenant = {
	id: 'tid-1',
	slug: 'acme',
	legal_name: 'Acme Pharma Pvt Ltd',
	display_name: 'Acme',
	admin_email: 'admin@acme.test',
	status: 'active',
	created_at: '2026-01-15T10:30:00Z',
	admin_address: {},
	password_policy: {
		min_length: 12,
		require_uppercase: true,
		require_lowercase: true,
		require_digit: true,
		require_symbol: false,
		max_failed_attempts: 5,
		lockout_minutes: 15
	}
};

describe('tenantDisplayName', () => {
	it('prefers display_name when present', () => {
		expect(tenantDisplayName(BASE_TENANT)).toBe('Acme');
	});

	it('falls back to legal_name when display_name is empty', () => {
		expect(tenantDisplayName({ ...BASE_TENANT, display_name: '' })).toBe('Acme Pharma Pvt Ltd');
	});

	it('treats whitespace-only display_name as empty', () => {
		expect(tenantDisplayName({ ...BASE_TENANT, display_name: '   ' })).toBe('Acme Pharma Pvt Ltd');
	});
});

describe('tenantStatusBadge', () => {
	it('maps known statuses to label + variant', () => {
		expect(tenantStatusBadge('active')).toEqual({ label: 'Active', variant: 'success' });
		expect(tenantStatusBadge('pending')).toEqual({ label: 'Pending', variant: 'info' });
		expect(tenantStatusBadge('suspended')).toEqual({ label: 'Suspended', variant: 'warning' });
		expect(tenantStatusBadge('pending_deletion')).toEqual({
			label: 'Scheduled for deletion',
			variant: 'danger'
		});
	});

	it('falls through unknown statuses with neutral info variant + raw label', () => {
		expect(tenantStatusBadge('quarantined')).toEqual({ label: 'quarantined', variant: 'info' });
	});
});

describe('formattedPhone', () => {
	it('formats 10-digit Indian numbers with +91 prefix', () => {
		expect(formattedPhone('9999900000')).toBe('+91 99999 00000');
	});

	it('reformats +919999900000 cleanly', () => {
		expect(formattedPhone('+919999900000')).toBe('+91 99999 00000');
	});

	it('is idempotent on already-formatted input', () => {
		expect(formattedPhone('+91 99999 00000')).toBe('+91 99999 00000');
	});

	it('passes through non-Indian numbers verbatim', () => {
		expect(formattedPhone('+1 555-1234')).toBe('+1 555-1234');
	});

	it('returns empty string for undefined or whitespace', () => {
		expect(formattedPhone(undefined)).toBe('');
		expect(formattedPhone('  ')).toBe('');
	});
});

describe('formattedPincode', () => {
	it('formats valid 6-digit pincodes with a space after the third digit', () => {
		expect(formattedPincode('400076')).toBe('400 076');
		expect(formattedPincode('110001')).toBe('110 001');
	});

	it('passes through non-6-digit values verbatim', () => {
		expect(formattedPincode('10001')).toBe('10001');
		expect(formattedPincode('SW1A 1AA')).toBe('SW1A 1AA');
	});

	it('returns empty string for undefined / whitespace', () => {
		expect(formattedPincode(undefined)).toBe('');
		expect(formattedPincode('   ')).toBe('');
	});
});

describe('formattedAddressLines', () => {
	it('produces three lines for a complete address', () => {
		expect(
			formattedAddressLines({
				street: '12 Pharma Park',
				city: 'Mumbai',
				district: 'Mumbai Suburban',
				state: 'Maharashtra',
				state_code: '27',
				pincode: '400076'
			})
		).toEqual(['12 Pharma Park', 'Mumbai, Mumbai Suburban', 'Maharashtra — 400 076']);
	});

	it('drops empty pieces without leaving blank lines', () => {
		expect(
			formattedAddressLines({
				street: '12 Pharma Park',
				city: 'Mumbai',
				pincode: '400076'
			})
		).toEqual(['12 Pharma Park', 'Mumbai', '400 076']);
	});

	it('returns empty array for an empty / undefined address', () => {
		expect(formattedAddressLines(undefined)).toEqual([]);
		expect(formattedAddressLines({})).toEqual([]);
	});
});
