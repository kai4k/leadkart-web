/**
 * Unit tests for operator/tenants view-models.
 *
 * All functions are pure (no async, no side effects) so tests run
 * without a browser environment or store setup.
 */
import { describe, expect, it } from 'vitest';
import {
	tenantLifecycleBadge,
	canSuspend,
	canActivate,
	canMarkForDeletion,
	canRestore
} from '$lib/features/operator/tenants/view-models';
import type { TenantDto } from '$lib/features/operator/tenants/types';

// ---------------------------------------------------------------------------
// Fixture factory — only fields consumed by view-models needed
// ---------------------------------------------------------------------------

function makeTenant(status: string): TenantDto {
	return {
		id: 'tid-001',
		slug: 'acme',
		legal_name: 'Acme Ltd',
		display_name: 'Acme',
		status,
		created_at: '2026-01-01T00:00:00Z',
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
}

// ---------------------------------------------------------------------------
// tenantLifecycleBadge
// ---------------------------------------------------------------------------

describe('tenantLifecycleBadge', () => {
	it('active → success variant + "Active" label', () => {
		const badge = tenantLifecycleBadge(makeTenant('active'));
		expect(badge.variant).toBe('success');
		expect(badge.label).toBe('Active');
	});

	it('suspended → warning variant + "Suspended" label', () => {
		const badge = tenantLifecycleBadge(makeTenant('suspended'));
		expect(badge.variant).toBe('warning');
		expect(badge.label).toBe('Suspended');
	});

	it('marked_for_deletion → danger variant + "Marked for deletion" label', () => {
		const badge = tenantLifecycleBadge(makeTenant('marked_for_deletion'));
		expect(badge.variant).toBe('danger');
		expect(badge.label).toBe('Marked for deletion');
	});

	it('pending → info variant + "Pending" label', () => {
		const badge = tenantLifecycleBadge(makeTenant('pending'));
		expect(badge.variant).toBe('info');
		expect(badge.label).toBe('Pending');
	});

	it('unknown status → neutral variant + raw status as label', () => {
		const badge = tenantLifecycleBadge(makeTenant('archived'));
		expect(badge.variant).toBe('neutral');
		expect(badge.label).toBe('archived');
	});
});

// ---------------------------------------------------------------------------
// canSuspend
// ---------------------------------------------------------------------------

describe('canSuspend', () => {
	it('true when status is active', () => {
		expect(canSuspend(makeTenant('active'))).toBe(true);
	});

	it('false when status is suspended', () => {
		expect(canSuspend(makeTenant('suspended'))).toBe(false);
	});

	it('false when status is marked_for_deletion', () => {
		expect(canSuspend(makeTenant('marked_for_deletion'))).toBe(false);
	});

	it('false when status is pending', () => {
		expect(canSuspend(makeTenant('pending'))).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canActivate
// ---------------------------------------------------------------------------

describe('canActivate', () => {
	it('true when status is suspended', () => {
		expect(canActivate(makeTenant('suspended'))).toBe(true);
	});

	it('false when status is active', () => {
		expect(canActivate(makeTenant('active'))).toBe(false);
	});

	it('false when status is marked_for_deletion', () => {
		expect(canActivate(makeTenant('marked_for_deletion'))).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canMarkForDeletion
// ---------------------------------------------------------------------------

describe('canMarkForDeletion', () => {
	it('true when status is active', () => {
		expect(canMarkForDeletion(makeTenant('active'))).toBe(true);
	});

	it('true when status is suspended', () => {
		expect(canMarkForDeletion(makeTenant('suspended'))).toBe(true);
	});

	it('false when status is marked_for_deletion', () => {
		expect(canMarkForDeletion(makeTenant('marked_for_deletion'))).toBe(false);
	});

	it('false when status is pending', () => {
		expect(canMarkForDeletion(makeTenant('pending'))).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canRestore
// ---------------------------------------------------------------------------

describe('canRestore', () => {
	it('true when status is marked_for_deletion', () => {
		expect(canRestore(makeTenant('marked_for_deletion'))).toBe(true);
	});

	it('false when status is active', () => {
		expect(canRestore(makeTenant('active'))).toBe(false);
	});

	it('false when status is suspended', () => {
		expect(canRestore(makeTenant('suspended'))).toBe(false);
	});

	it('false when status is pending', () => {
		expect(canRestore(makeTenant('pending'))).toBe(false);
	});
});
