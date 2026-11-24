import { beforeAll, describe, expect, it } from 'vitest';
import { _, addMessages, init } from 'svelte-i18n';
import { get } from 'svelte/store';
import en from '#lib/i18n/locales/en.json';
import {
	isProtectedRole,
	roleKind,
	roleKindKey,
	rolePermissionSet,
	roleMemberCount,
	roleHoldersMessage
} from '#lib/features/roles/view-models.ts';
import type { RoleDto } from '#lib/features/roles/types.ts';

const base: RoleDto = {
	id: 'r1',
	tenant_id: 't1',
	name: 'SalesExecutive',
	is_active: true,
	is_system_default: false,
	is_super_admin: false,
	hierarchy_level: 3,
	permissions: ['identity.users.view', 'identity.roles.view'],
	created_at: '2026-01-01T00:00:00Z'
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

const kindBadge = (role: Parameters<typeof roleKindKey>[0]) => roleKind(roleKindKey(role));

describe('roleKind', () => {
	it('custom role → neutral variant with "Custom" label', () => {
		const result = kindBadge(base);
		expect(result.variant).toBe('neutral');
		expect(result.label).toBe('Custom');
	});

	it('system-default role → info variant with "System" label', () => {
		const result = kindBadge(systemRole);
		expect(result.variant).toBe('info');
		expect(result.label).toBe('System');
	});

	it('super-admin role → warning variant with "SuperAdmin" label', () => {
		const result = kindBadge(superAdminRole);
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

describe('roleHoldersMessage (409 role_in_use)', () => {
	beforeAll(async () => {
		addMessages('en', en);
		await init({ fallbackLocale: 'en', initialLocale: 'en' });
	});
	const say = (holders: number | undefined, names: string[]): string | null => {
		const m = roleHoldersMessage(holders, names);
		return m === null ? null : get(_)(m.key, { values: m.values });
	};

	it('says nothing when Go sent no count', () => {
		expect(roleHoldersMessage(undefined, ['A'])).toBeNull();
		expect(roleHoldersMessage(0, [])).toBeNull();
	});
	it('one person', () => {
		expect(say(1, ['Asha'])).toBe('1 person holds this role: Asha.');
	});
	it('names without a rest', () => {
		expect(say(2, ['Asha', 'Ravi'])).toBe('2 people hold this role: Asha, Ravi.');
	});
	it('up to 5 names and the rest as a count', () => {
		expect(say(8, ['A', 'B', 'C', 'D', 'E'])).toBe(
			'8 people hold this role: A, B, C, D, E and 3 more.'
		);
	});
	it('a count without names', () => {
		expect(say(3, [])).toBe('3 people hold this role.');
		expect(say(1, [])).toBe('1 person holds this role.');
	});
});
