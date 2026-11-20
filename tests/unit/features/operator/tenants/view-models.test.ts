/**
 * Unit tests for operator/tenants view-models.
 *
 * All functions are pure (no async, no side effects) so tests run
 * without a browser environment or store setup.
 */
import { describe, expect, it } from 'vitest';
import {
	canSuspend,
	canActivate,
	canMarkForDeletion,
	canRestore
} from '#lib/features/operator/tenants/view-models.ts';
import type { TenantDto } from '#lib/features/operator/tenants/types.ts';

// ---------------------------------------------------------------------------
// Fixture factory — only fields consumed by view-models needed
// ---------------------------------------------------------------------------

function makeTenant(status: TenantDto['status']): TenantDto {
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
// canSuspend
// ---------------------------------------------------------------------------

describe('canSuspend', () => {
	it('true when status is active', () => {
		expect(canSuspend(makeTenant('active'))).toBe(true);
	});

	it('false when status is suspended', () => {
		expect(canSuspend(makeTenant('suspended'))).toBe(false);
	});

	it('false when status is pending_deletion', () => {
		expect(canSuspend(makeTenant('pending_deletion'))).toBe(false);
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

	it('false when status is pending_deletion', () => {
		expect(canActivate(makeTenant('pending_deletion'))).toBe(false);
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

	it('false when status is pending_deletion', () => {
		expect(canMarkForDeletion(makeTenant('pending_deletion'))).toBe(false);
	});

	it('false when status is pending', () => {
		expect(canMarkForDeletion(makeTenant('pending'))).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canRestore
// ---------------------------------------------------------------------------

describe('canRestore', () => {
	it('true when status is pending_deletion', () => {
		expect(canRestore(makeTenant('pending_deletion'))).toBe(true);
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
