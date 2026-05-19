import { describe, expect, it } from 'vitest';
import {
	userStatusBadge,
	userRoleBadges,
	managerLabel,
	canDeactivate,
	canRevokeRole
} from '$lib/features/users/view-models';
import type { UserDto, RoleDto } from '$lib/features/users/types';

const u: UserDto = {
	membership_id: 'm1',
	person_id: 'p1',
	tenant_id: 't1',
	email: 'a@b.com',
	first_name: 'Ada',
	last_name: 'L',
	status: 'active',
	designation: 'Eng',
	department: 'Plat',
	status_message: '',
	joined_at: '2026-01-01T00:00:00Z',
	left_at: null,
	reports_to: null,
	role_ids: ['r1']
};

const role: RoleDto = {
	id: 'r1',
	tenant_id: 't1',
	name: 'SalesExecutive',
	is_system_default: false,
	is_super_admin: false,
	hierarchy_level: 3,
	permissions: [],
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z'
};

describe('userStatusBadge', () => {
	it('active → success', () => {
		expect(userStatusBadge('active').variant).toBe('success');
	});
	it('inactive → neutral', () => {
		expect(userStatusBadge('inactive').variant).toBe('neutral');
	});
	it('pending → warning', () => {
		expect(userStatusBadge('pending').variant).toBe('warning');
	});
});

describe('userRoleBadges', () => {
	it('maps role_ids to role names', () => {
		expect(userRoleBadges(u, [role])).toEqual([{ id: 'r1', name: 'SalesExecutive' }]);
	});
	it('shows id when role not in catalogue', () => {
		expect(userRoleBadges(u, [])).toEqual([{ id: 'r1', name: 'r1' }]);
	});
});

describe('managerLabel', () => {
	it('null when no manager', () => {
		expect(managerLabel(u, [])).toBeNull();
	});
	it('returns name when manager in roster', () => {
		const mgr: UserDto = { ...u, membership_id: 'm2', first_name: 'Bob', last_name: 'M' };
		const subordinate: UserDto = { ...u, reports_to: 'm2' };
		expect(managerLabel(subordinate, [mgr])).toBe('Bob M');
	});
});

describe('canDeactivate', () => {
	it('false when status not active', () => {
		expect(canDeactivate({ ...u, status: 'inactive' })).toBe(false);
	});
	it('true when active', () => {
		expect(canDeactivate(u)).toBe(true);
	});
});

describe('canRevokeRole', () => {
	it('false for super-admin role', () => {
		expect(canRevokeRole({ ...role, is_super_admin: true })).toBe(false);
	});
	it('true for normal role', () => {
		expect(canRevokeRole(role)).toBe(true);
	});
});
