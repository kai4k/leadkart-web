/**
 * Capability / permission-check tests. These cover the hasCapability helper
 * that replaced the deleted tier.ts module. The function is the UX-hint gate
 * components use to show/hide actions — drift here means buttons appear for
 * users who can't take the action. Pin every branch.
 */
import { describe, expect, it } from 'vitest';
import { hasCapability } from '$lib/features/auth/capabilities';
import type { Capabilities } from '$lib/features/auth/capabilities';

function caps(overrides: Partial<Capabilities> = {}): Capabilities {
	return {
		tier: 'tenant-user',
		tenant_id: 'tid-1',
		tenant_slug: 'acme',
		is_platform: false,
		is_super_user: false,
		permissions: [],
		features: [],
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
		const c = caps({ is_platform: true, is_super_user: true, tier: 'platform-super' });
		expect(hasCapability(c, 'platform.tenants.delete')).toBe(true);
	});

	it('returns false for platform-staff without the specific permission', () => {
		const c = caps({ is_platform: true, is_super_user: false, tier: 'platform-staff' });
		expect(hasCapability(c, 'platform.tenants.manage')).toBe(false);
	});

	it('returns true for platform-staff with the specific permission', () => {
		const c = caps({
			is_platform: true,
			is_super_user: false,
			tier: 'platform-staff',
			permissions: ['platform.tenants.view']
		});
		expect(hasCapability(c, 'platform.tenants.view')).toBe(true);
	});
});
