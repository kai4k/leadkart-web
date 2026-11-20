import { describe, expect, it } from 'vitest';
import { P } from '#lib/features/auth/permissions.ts';
import {
	ALL_PERMISSIONS,
	effectivePermissions,
	NO_PERMISSIONS,
	OPERATOR_ONE_PERMISSION,
	OWNER,
	persona,
	PLATFORM_RESERVED,
	SALES_EXECUTIVE,
	SALES_MANAGER,
	SUPER_USER,
	tierOfRank
} from '../../support/go-personas.ts';

/** The persona builder is the test-side copy of Go's projection: these cases pin the rules it copies. */
describe("go-personas: Go's effective_permissions rules", () => {
	it('a super user satisfies EVERY catalogue name (not just the platform-reserved ones)', () => {
		expect(SUPER_USER.effective_permissions).toEqual([...ALL_PERMISSIONS].sort());
		expect(SUPER_USER.effective_permissions).toContain(P.crmLeadsRead);
		expect(SUPER_USER.effective_permissions).toContain(P.platformTenantsView);
	});

	it('tenant.admin implies every known name except the platform-reserved ones (and not itself twice)', () => {
		const eff = OWNER.effective_permissions;
		expect(eff).toContain('tenant.admin');
		expect(eff).toContain(P.identityTenantsUpdate);
		expect(eff).toContain(P.identityMetaRequestPermissionElevation);
		for (const reserved of PLATFORM_RESERVED) {
			if (reserved !== 'tenant.admin') expect(eff).not.toContain(reserved);
		}
		expect(eff).not.toContain(P.identityUsersAnonymise);
	});

	it('a platform operator holding platform.tenants.view also gets identity.tenants.view, and nothing else', () => {
		const eff = OPERATOR_ONE_PERMISSION.effective_permissions;
		expect(eff).toEqual([P.identityTenantsView, P.platformTenantsView].sort());
	});

	it('platform.tenants.manage satisfies view, update and update_settings; users.manage the user actions', () => {
		const eff = effectivePermissions({
			permissions: [P.platformTenantsManage, P.platformUsersManage],
			isPlatform: true
		});
		for (const n of [
			P.identityTenantsView,
			P.identityTenantsUpdate,
			P.identityTenantsUpdateSettings,
			P.identityUsersView,
			P.identityUsersCreate,
			P.identityUsersUpdate,
			P.identityUsersDeactivate,
			P.identityUsersUpdatePermissions
		]) {
			expect(eff).toContain(n);
		}
		expect(eff).not.toContain(P.identityRolesCreate);
	});

	it('a platform-reserved name held by a NON-operator satisfies nothing', () => {
		expect(
			effectivePermissions({ permissions: [P.platformTenantsManage], isPlatform: false })
		).toEqual([]);
	});

	it('an unknown name is never satisfied', () => {
		expect(effectivePermissions({ permissions: ['made.up.name'] })).toEqual([]);
		expect(NO_PERMISSIONS.effective_permissions).toEqual([]);
	});
});

describe('go-personas: the seeded roles are their real grants', () => {
	it('Sales Executive: crm read + manage (no read_all, no assign), quotes and payments, tasks, inbox, elevation', () => {
		const eff = SALES_EXECUTIVE.effective_permissions;
		expect(eff).toEqual(
			expect.arrayContaining([
				P.crmLeadsRead,
				P.crmLeadsManage,
				P.ordersQuotationsManage,
				P.ordersPaymentsRecord,
				P.tasksManage,
				P.notificationsRead,
				P.identityMetaRequestPermissionElevation
			])
		);
		expect(eff).not.toContain(P.crmLeadsReadAll);
		expect(eff).not.toContain(P.crmLeadsAssign);
		expect(eff).not.toContain(P.ordersOrdersManage);
		expect(eff).not.toContain(P.identityUsersView);
		expect(SALES_EXECUTIVE.tier).toBe('user');
		expect(SALES_EXECUTIVE.rank).toBe(50);
	});

	it('Sales Manager: the full crm set, the full orders bundle, the directory views, approve; rank 20 = manager', () => {
		const eff = SALES_MANAGER.effective_permissions;
		expect(eff).toEqual(
			expect.arrayContaining([
				P.crmLeadsAssign,
				P.crmLeadsReadAll,
				P.ordersOrdersManage,
				P.identityUsersView,
				P.identityRolesView,
				P.identityRolesApprove
			])
		);
		expect(eff).not.toContain(P.identityUsersCreate);
		expect(SALES_MANAGER.tier).toBe('manager');
	});

	it('a persona with two roles takes the best rank and the union of grants', () => {
		const both = persona({ roles: ['Sales Executive', 'Team Lead'] });
		expect(both.rank).toBe(30);
		expect(both.tier).toBe('team_lead');
		expect(both.effective_permissions).toContain(P.identityRolesApprove);
		expect(both.effective_permissions).toContain(P.ordersQuotationsManage);
	});

	it('Go Rank.Tier bands', () => {
		expect([0, 1, 10, 11, 20, 21, 30, 31, 99].map(tierOfRank)).toEqual([
			'owner',
			'admin',
			'admin',
			'manager',
			'manager',
			'team_lead',
			'team_lead',
			'user',
			'user'
		]);
	});
});
