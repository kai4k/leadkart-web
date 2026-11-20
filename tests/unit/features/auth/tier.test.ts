/**
 * The web's one permission rule: `can(p)` is true iff `p` is in
 * `capabilities.effective_permissions` (Go computes that list). Nothing else
 * authorises: not `is_super_user`, not `is_platform`, not `tenant.admin`, not
 * tier or rank. The only subtraction is Go's tenant-context refusals.
 */
import { describe, expect, it } from 'vitest';
import {
	can,
	canAny,
	dashboardVariant,
	type Capabilities
} from '#lib/features/auth/capabilities.ts';
import { P, isBlockedInTenantContext } from '#lib/features/auth/permissions.ts';

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
		effective_permissions: [],
		roles: [],
		rank: 99,
		tier: 'user',
		...overrides
	};
}

describe('can', () => {
	it('is false without capabilities (not yet resolved / signed out)', () => {
		expect(can(undefined, P.identityUsersView)).toBe(false);
		expect(can(null, P.identityUsersView)).toBe(false);
	});

	it('is true exactly when the name is in effective_permissions', () => {
		const c = caps({ effective_permissions: [P.identityUsersView] });
		expect(can(c, P.identityUsersView)).toBe(true);
		expect(can(c, P.identityUsersCreate)).toBe(false);
	});

	it('does NOT read the JWT `permissions` list', () => {
		expect(can(caps({ permissions: [P.crmLeadsRead] }), P.crmLeadsRead)).toBe(false);
	});

	it('applies no tenant.admin implication of its own', () => {
		const c = caps({ permissions: ['tenant.admin'], effective_permissions: ['tenant.admin'] });
		expect(can(c, P.identityUsersView)).toBe(false);
		expect(can(c, P.crmLeadsRead)).toBe(false);
	});

	it('applies no super-user shortcut', () => {
		expect(can(caps({ is_super_user: true }), P.crmLeadsRead)).toBe(false);
		expect(can(caps({ is_super_user: true }), P.platformTenantsView)).toBe(false);
	});

	it('applies no platform shortcut: is_platform alone grants no platform.* name', () => {
		const c = caps({ is_platform: true, tenant_slug: 'platform' });
		expect(can(c, P.platformTenantsView)).toBe(false);
		expect(
			can(caps({ ...c, effective_permissions: [P.platformTenantsView] }), P.platformTenantsView)
		).toBe(true);
	});

	it('never authorises on tier or rank', () => {
		const owner = caps({ tier: 'owner', rank: 0 });
		expect(can(owner, P.identityUsersView)).toBe(false);
		expect(can(owner, P.crmLeadsManage)).toBe(false);
	});
});

describe('canAny', () => {
	const c = caps({ effective_permissions: [P.ordersQuotationsRead] });
	it('is true when any listed name is held', () => {
		expect(canAny(c, [P.ordersOrdersRead, P.ordersQuotationsRead])).toBe(true);
	});
	it('is false when none is held, or the list is empty, or caps are missing', () => {
		expect(canAny(c, [P.ordersOrdersRead, P.ordersOrdersManage])).toBe(false);
		expect(canAny(c, [])).toBe(false);
		expect(canAny(null, [P.ordersQuotationsRead])).toBe(false);
	});
});

describe('tenant context (Go tenant_scope_read_only / tenant_scope_not_supported)', () => {
	it('blocks writes of crm / orders / inventory / dispatch / tasks for everyone; reads only for a non-super operator', () => {
		for (const name of [
			P.crmLeadsManage,
			P.crmLeadsAssign,
			P.ordersOrdersManage,
			P.ordersQuotationsManage,
			P.ordersPaymentsRecord,
			P.inventoryCatalogManage,
			P.inventoryStockManage,
			P.dispatchManage,
			P.tasksManage,
			P.tasksReassign
		])
			expect(isBlockedInTenantContext(name), name).toBe(true);
		for (const name of [
			P.crmLeadsRead,
			P.crmLeadsReadAll,
			P.ordersOrdersRead,
			P.ordersInvoicesRead,
			P.ordersPaymentsRead,
			P.inventoryCatalogRead,
			P.inventoryStockRead,
			P.dispatchRead,
			P.tasksRead,
			P.tasksReadAll
		])
			expect(isBlockedInTenantContext(name, true), name).toBe(false); // super user reads
		for (const name of [P.crmLeadsRead, P.ordersOrdersRead, P.inventoryCatalogRead, P.tasksReadAll])
			expect(isBlockedInTenantContext(name), name).toBe(true); // non-super operator: Go 403
		expect(isBlockedInTenantContext('platform.lead_credits.read')).toBe(true);
		expect(isBlockedInTenantContext('platform.lead_credits.read', true)).toBe(false);
	});

	it('blocks permission requests and marketplace purchase', () => {
		expect(isBlockedInTenantContext(P.identityMetaRequestPermissionElevation)).toBe(true);
		expect(isBlockedInTenantContext(P.identityRolesApprove)).toBe(true);
		expect(isBlockedInTenantContext(P.platformMarketplacePurchase)).toBe(true);
	});

	it('leaves identity writes and platform names alone (Go accepts 17 identity writes under scope)', () => {
		for (const name of [
			P.identityUsersCreate,
			P.identityRolesCreate,
			P.platformUsersManage,
			P.platformTenantsManage,
			P.notificationsManage
		])
			expect(isBlockedInTenantContext(name), name).toBe(false);
	});

	it('can() only subtracts in tenant context, never adds', () => {
		const c = caps({
			is_super_user: true,
			effective_permissions: [P.crmLeadsManage, P.crmLeadsRead]
		});
		expect(can(c, P.crmLeadsManage)).toBe(true);
		expect(can(c, P.crmLeadsManage, true)).toBe(false);
		expect(can(c, P.crmLeadsRead, true)).toBe(true);
		expect(canAny(c, [P.crmLeadsManage], true)).toBe(false);
		expect(can(c, P.crmLeadsAssign, true)).toBe(false);
	});

	it('a non-super operator loses the reads too: Go answers 403 for them under the scope header', () => {
		const c = caps({
			is_platform: true,
			effective_permissions: [P.crmLeadsRead, P.ordersOrdersRead, P.inventoryCatalogRead]
		});
		expect(can(c, P.crmLeadsRead)).toBe(true);
		expect(can(c, P.crmLeadsRead, true)).toBe(false);
		expect(can(c, P.ordersOrdersRead, true)).toBe(false);
		expect(can(c, P.inventoryCatalogRead, true)).toBe(false);
	});
});

describe('dashboardVariant (a layout choice, not an authorisation)', () => {
	it('platform operators get the platform dashboard', () => {
		expect(dashboardVariant(caps({ is_platform: true }))).toBe('platform');
	});
	it('owner and admin tiers get the tenant-admin dashboard', () => {
		expect(dashboardVariant(caps({ tier: 'owner', rank: 0 }))).toBe('tenant-admin');
		expect(dashboardVariant(caps({ tier: 'admin', rank: 5 }))).toBe('tenant-admin');
	});
	it('every other tier, and no capabilities, get the user dashboard', () => {
		for (const tier of ['manager', 'team_lead', 'user'] as const)
			expect(dashboardVariant(caps({ tier }))).toBe('tenant-user');
		expect(dashboardVariant(undefined)).toBe('tenant-user');
	});
});
