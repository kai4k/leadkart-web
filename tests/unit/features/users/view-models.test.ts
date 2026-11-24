import { describe, expect, it } from 'vitest';
import {
	userRoleBadges,
	managerLabel,
	canDeactivate,
	canRevokeRole,
	bulkSummary,
	eligibleManagers
} from '#lib/features/users/view-models.ts';
import type { UserDto, RoleDto } from '#lib/features/users/types.ts';

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
	role_ids: ['r1']
};

const role: RoleDto = {
	id: 'r1',
	tenant_id: 't1',
	name: 'SalesExecutive',
	is_active: true,
	is_system_default: false,
	is_super_admin: false,
	hierarchy_level: 3,
	permissions: [],
	created_at: '2026-01-01T00:00:00Z'
};

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

describe("eligibleManagers (Go's maySetManager: active, strictly more senior)", () => {
	const level = (id: string, hierarchy_level: number): RoleDto => ({
		...role,
		id,
		hierarchy_level
	});
	const roles = [level('owner', 0), level('admin', 5), level('lead', 25), level('user', 50)];
	const member = (id: string, role_ids: string[], over: Partial<UserDto> = {}): UserDto => ({
		...u,
		membership_id: id,
		role_ids,
		...over
	});
	const roster = [
		member('admin', ['admin']),
		member('lead', ['lead']),
		member('user', ['user']),
		member('peer', ['user']),
		member('gone', ['admin'], { status: 'inactive' }),
		member('none', []),
		member('boss', ['owner'])
	];
	const ids = (who: UserDto) => eligibleManagers(who, roster, roles).map((m) => m.membership_id);

	it('offers only active members with a lower level number, never the member', () => {
		expect(ids(roster[2]!)).toEqual(['admin', 'lead', 'boss']);
		expect(ids(roster[1]!)).toEqual(['admin', 'boss']);
	});

	it('the most senior of several roles is the rank', () => {
		expect(ids(member('x', ['user', 'lead']))).toEqual(['admin', 'boss']);
	});

	it('a member with no role is the least senior: everyone with a role qualifies, another role-less member does not', () => {
		expect(ids(roster[5]!)).toEqual(['admin', 'lead', 'user', 'peer', 'boss']);
	});

	it('an unknown rank (a role missing from the list) excludes nobody: Go decides', () => {
		expect(ids(member('x', ['not-loaded']))).toEqual([
			'admin',
			'lead',
			'user',
			'peer',
			'none',
			'boss'
		]);
		expect(eligibleManagers(roster[2]!, roster, []).map((m) => m.membership_id)).toEqual([
			'admin',
			'lead',
			'peer',
			'none',
			'boss'
		]);
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

describe('bulkSummary', () => {
	it('reads "N deactivated" or "N reactivated"', () => {
		expect(bulkSummary('deactivate', { succeeded: 3, failed: 0, failedIds: [] })).toBe(
			'3 deactivated'
		);
		expect(bulkSummary('reactivate', { succeeded: 2, failed: 0, failedIds: [] })).toBe(
			'2 reactivated'
		);
	});
	it('appends the failures', () => {
		expect(bulkSummary('deactivate', { succeeded: 2, failed: 1, failedIds: ['b'] })).toBe(
			'2 deactivated, 1 failed'
		);
	});
	it('names the first failure reason when there is one', () => {
		expect(
			bulkSummary('deactivate', {
				succeeded: 2,
				failed: 1,
				failedIds: ['b'],
				firstFailureReason: "You can't make this change to your own account."
			})
		).toBe("2 deactivated, 1 failed: You can't make this change to your own account.");
	});
	it('is empty when nothing was attempted', () => {
		expect(bulkSummary('deactivate', { succeeded: 0, failed: 0, failedIds: [] })).toBe('');
	});
});

describe('bulkTargets: a bulk action reaches only what is loaded and would change', () => {
	const u = (id: string, status: 'active' | 'inactive') => ({ membership_id: id, status }) as never;
	const roster = [u('a', 'active'), u('b', 'inactive'), u('c', 'active')];

	it('deactivate sends the active ones; reactivate the inactive ones', async () => {
		const { bulkTargets } = await import('#lib/features/users/view-models.ts');
		expect(bulkTargets('deactivate', ['a', 'b', 'c'], roster).ids).toEqual(['a', 'c']);
		expect(bulkTargets('reactivate', ['a', 'b', 'c'], roster).ids).toEqual(['b']);
	});

	it('an id that is no longer loaded is dropped, and reported so the selection can forget it', async () => {
		const { bulkTargets } = await import('#lib/features/users/view-models.ts');
		const r = bulkTargets('deactivate', ['a', 'gone'], roster);
		expect(r.ids).toEqual(['a']);
		expect(r.unloaded).toEqual(['gone']);
	});
});
