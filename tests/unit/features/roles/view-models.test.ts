import { describe, expect, it } from 'vitest';
import {
	isProtectedRole,
	roleBadgeVariant,
	rolePermissionSet,
	roleMemberCount
} from '$lib/features/roles/view-models';
import type { RoleDto } from '$lib/features/roles/types';

const base: RoleDto = {
	id: 'r1',
	tenant_id: 't1',
	name: 'SalesExecutive',
	is_system_default: false,
	is_super_admin: false,
	hierarchy_level: 3,
	permissions: ['identity.users.view', 'identity.roles.view'],
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z'
};

const systemRole: RoleDto = { ...base, id: 'r2', name: 'Admin', is_system_default: true };
const superAdminRole: RoleDto = {
	...base,
	id: 'r3',
	name: 'SuperAdmin',
	is_super_admin: true,
	is_system_default: true
};

const roster = [
	{ role_ids: ['r1'], status: 'active' },
	{ role_ids: ['r1'], status: 'active' },
	{ role_ids: ['r1'], status: 'inactive' }, // should not count
	{ role_ids: ['r2'], status: 'active' }
];

describe('isProtectedRole', () => {
	it('returns false for a custom role', () => {
		expect(isProtectedRole(base)).toBe(false);
	});

	it('returns true for a system-default role', () => {
		expect(isProtectedRole(systemRole)).toBe(true);
	});

	it('returns true for a super-admin role', () => {
		expect(isProtectedRole(superAdminRole)).toBe(true);
	});
});

describe('roleBadgeVariant', () => {
	it('custom role → neutral variant with "Custom" label', () => {
		const result = roleBadgeVariant(base);
		expect(result.variant).toBe('neutral');
		expect(result.label).toBe('Custom');
	});

	it('system-default role → info variant with "System" label', () => {
		const result = roleBadgeVariant(systemRole);
		expect(result.variant).toBe('info');
		expect(result.label).toBe('System');
	});

	it('super-admin role → warning variant with "SuperAdmin" label', () => {
		const result = roleBadgeVariant(superAdminRole);
		expect(result.variant).toBe('warning');
		expect(result.label).toBe('SuperAdmin');
	});
});

describe('rolePermissionSet', () => {
	it('returns a Set from the role permissions array', () => {
		const set = rolePermissionSet(base);
		expect(set).toBeInstanceOf(Set);
		expect(set.has('identity.users.view')).toBe(true);
		expect(set.has('identity.roles.view')).toBe(true);
	});

	it('returns an empty Set when role has no permissions', () => {
		const noPerms: RoleDto = { ...base, permissions: [] };
		const set = rolePermissionSet(noPerms);
		expect(set.size).toBe(0);
	});

	it('set size matches permissions array length', () => {
		const set = rolePermissionSet(base);
		expect(set.size).toBe(base.permissions.length);
	});
});

describe('roleMemberCount', () => {
	it('counts only active members assigned to the role', () => {
		// r1 has 2 active + 1 inactive → should be 2
		expect(roleMemberCount(base, roster)).toBe(2);
	});

	it('counts active members for a different role', () => {
		// r2 has 1 active member
		expect(roleMemberCount(systemRole, roster)).toBe(1);
	});

	it('returns 0 when no members are assigned to the role', () => {
		expect(roleMemberCount(superAdminRole, roster)).toBe(0);
	});

	it('returns 0 for an empty roster', () => {
		expect(roleMemberCount(base, [])).toBe(0);
	});
});
