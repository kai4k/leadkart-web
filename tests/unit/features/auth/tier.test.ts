/**
 * Tier-classification tests. The function decides which sidebar /
 * dashboard variant the user sees — drift here means the wrong UI
 * surface ships. Pin every branch.
 */
import { describe, expect, it } from 'vitest';
import { hasPermission, isPlatformTier, isTenantAdmin, tierOf } from '$lib/features/auth/tier';
import type { SessionPrincipal } from '$lib/features/auth/types';

function principal(overrides: Partial<SessionPrincipal> = {}): SessionPrincipal {
	return {
		personId: 'pid-1',
		tenantId: 'tid-1',
		membershipId: 'mid-1',
		email: 'user@acme.test',
		accessToken: 'fake',
		refreshToken: 'fake',
		accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
		...overrides
	};
}

describe('tierOf', () => {
	it('returns "unknown" for null principal (signed-out)', () => {
		expect(tierOf(null)).toBe('unknown');
	});

	it('returns "platform-super" for is_platform=true + is_super_user=true', () => {
		expect(tierOf(principal({ isPlatform: true, isSuperUser: true }))).toBe('platform-super');
	});

	it('returns "platform-staff" for is_platform=true without super-user (PlatformManager / LeadAgent)', () => {
		expect(tierOf(principal({ isPlatform: true, isSuperUser: false }))).toBe('platform-staff');
		expect(tierOf(principal({ isPlatform: true }))).toBe('platform-staff');
	});

	it('returns "tenant-admin" when is_super_user is set without is_platform (legacy seed)', () => {
		expect(tierOf(principal({ isPlatform: false, isSuperUser: true }))).toBe('tenant-admin');
	});

	it('returns "tenant-admin" when permissions include tenant.admin', () => {
		expect(tierOf(principal({ permissions: ['tenant.admin', 'identity.users.view'] }))).toBe(
			'tenant-admin'
		);
	});

	it('returns "tenant-user" for a regular tenant Membership', () => {
		expect(tierOf(principal({ permissions: ['crm.leads.view', 'crm.leads.update'] }))).toBe(
			'tenant-user'
		);
	});

	it('returns "tenant-user" when permissions array is missing', () => {
		expect(tierOf(principal())).toBe('tenant-user');
	});
});

describe('hasPermission', () => {
	it('returns false for null principal', () => {
		expect(hasPermission(null, 'identity.users.create')).toBe(false);
	});

	it('returns true unconditionally for is_super_user (short-circuit per ADR 0036)', () => {
		const p = principal({ isSuperUser: true, permissions: [] });
		expect(hasPermission(p, 'literally.anything')).toBe(true);
	});

	it('returns true when the permission is in the claim list', () => {
		expect(
			hasPermission(principal({ permissions: ['identity.users.create'] }), 'identity.users.create')
		).toBe(true);
	});

	it('returns false when the permission is absent', () => {
		expect(
			hasPermission(principal({ permissions: ['crm.leads.view'] }), 'identity.tenants.delete')
		).toBe(false);
	});

	it('returns false when permissions claim is missing entirely', () => {
		expect(hasPermission(principal(), 'identity.users.view')).toBe(false);
	});
});

describe('isPlatformTier', () => {
	it('true for platform-super', () => {
		expect(isPlatformTier(principal({ isPlatform: true, isSuperUser: true }))).toBe(true);
	});

	it('true for platform-staff', () => {
		expect(isPlatformTier(principal({ isPlatform: true }))).toBe(true);
	});

	it('false for tenant-admin (SuperUser-in-tenant)', () => {
		expect(isPlatformTier(principal({ isSuperUser: true }))).toBe(false);
	});

	it('false for tenant-user', () => {
		expect(isPlatformTier(principal())).toBe(false);
	});

	it('false for unknown', () => {
		expect(isPlatformTier(null)).toBe(false);
	});
});

describe('isTenantAdmin', () => {
	it('true for tenant.admin permission', () => {
		expect(isTenantAdmin(principal({ permissions: ['tenant.admin'] }))).toBe(true);
	});

	it('true for platform-super (god-mode covers tenant-admin)', () => {
		expect(isTenantAdmin(principal({ isPlatform: true, isSuperUser: true }))).toBe(true);
	});

	it('false for platform-staff (cross-tenant read, no tenant-admin scope)', () => {
		expect(isTenantAdmin(principal({ isPlatform: true }))).toBe(false);
	});

	it('false for plain tenant-user', () => {
		expect(isTenantAdmin(principal({ permissions: ['crm.leads.view'] }))).toBe(false);
	});
});
