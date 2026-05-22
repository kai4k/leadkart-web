/**
 * Capability / permission-check tests. These cover the hasCapability helper
 * and the deriveTier helper. hasCapability is the UX-hint gate components use
 * to show/hide actions — drift here means buttons appear for users who can't
 * take the action. deriveTier drives sidebar catalogue selection and dashboard
 * variant routing. Pin every branch.
 */
import { describe, expect, it } from 'vitest';
import { hasCapability, deriveTier } from '$lib/features/auth/capabilities';
import type { Capabilities } from '$lib/features/auth/capabilities';

function caps(overrides: Partial<Capabilities> = {}): Capabilities {
	return {
		person_id: 'per-1',
		membership_id: 'mid-1',
		tenant_id: 'tid-1',
		tenant_slug: 'acme',
		email: 'user@acme.test',
		first_name: 'Test',
		last_name: 'User',
		is_platform: false,
		is_super_user: false,
		permissions: [],
		roles: [],
		...overrides
	};
}

describe('hasCapability', () => {
	it('returns false when caps is undefined (query not yet resolved)', () => {
		expect(hasCapability(undefined, 'identity.users.create')).toBe(false);
	});

	it('returns true unconditionally for is_super_user (short-circuit per ADR 0036)', () => {
		expect(
			hasCapability(caps({ is_super_user: true, permissions: [] }), 'literally.anything')
		).toBe(true);
	});

	it('returns true when the permission is in the list', () => {
		expect(
			hasCapability(caps({ permissions: ['identity.users.create'] }), 'identity.users.create')
		).toBe(true);
	});

	it('returns false when the permission is absent', () => {
		expect(
			hasCapability(caps({ permissions: ['crm.leads.view'] }), 'identity.tenants.delete')
		).toBe(false);
	});

	it('returns false when permissions list is empty', () => {
		expect(hasCapability(caps(), 'identity.users.view')).toBe(false);
	});

	it('returns true for platform-super user on any permission', () => {
		const c = caps({ is_platform: true, is_super_user: true });
		expect(hasCapability(c, 'platform.tenants.delete')).toBe(true);
	});

	// Platform-tier users (is_platform=true) implicitly hold platform.*
	// permissions — see capabilities.ts comment. The server's
	// RequirePermission middleware is the actual gate; the client treats
	// the coarse claim as sufficient for UI affordances.
	it('returns true for platform-staff on any platform.* permission (coarse-claim implies fine)', () => {
		const c = caps({ is_platform: true, is_super_user: false });
		expect(hasCapability(c, 'platform.tenants.manage')).toBe(true);
		expect(hasCapability(c, 'platform.tenants.view')).toBe(true);
	});

	it('returns false for platform-staff on a non-platform.* permission they lack', () => {
		const c = caps({ is_platform: true, is_super_user: false });
		expect(hasCapability(c, 'crm.leads.delete')).toBe(false);
	});
});

describe('deriveTier', () => {
	it('returns unknown when caps is undefined', () => {
		expect(deriveTier(undefined)).toBe('unknown');
	});

	it('returns platform-super for is_platform + is_super_user', () => {
		expect(deriveTier(caps({ is_platform: true, is_super_user: true }))).toBe('platform-super');
	});

	it('returns platform-staff for is_platform without is_super_user', () => {
		expect(deriveTier(caps({ is_platform: true, is_super_user: false }))).toBe('platform-staff');
	});

	it('returns tenant-admin for is_super_user without is_platform', () => {
		expect(deriveTier(caps({ is_platform: false, is_super_user: true }))).toBe('tenant-admin');
	});

	it('returns tenant-admin for tenant.admin permission', () => {
		expect(deriveTier(caps({ permissions: ['tenant.admin'] }))).toBe('tenant-admin');
	});

	it('returns tenant-user for regular user with no special flags', () => {
		expect(deriveTier(caps({ permissions: ['crm.leads.view'] }))).toBe('tenant-user');
	});

	it('returns tenant-user for empty permissions', () => {
		expect(deriveTier(caps())).toBe('tenant-user');
	});
});
