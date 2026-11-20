/**
 * Representative capability sets (what Go puts in  for each kind of caller),
 * shared by the nav config tests and the server guard matrix.
 */
import type { Capabilities } from '#lib/features/auth/capabilities.ts';
import { P } from '#lib/features/auth/permissions.ts';
import { ALL_PERMISSIONS, TENANT_ADMIN_EFFECTIVE } from '../../e2e/helpers/permission-sets.ts';

export function caps(
	effective: readonly string[],
	overrides: Partial<Capabilities> = {}
): Capabilities {
	return {
		person_id: 'per-1',
		membership_id: 'mid-1',
		tenant_id: 'tid-1',
		tenant_slug: 'acme',
		is_platform: false,
		is_super_user: false,
		permissions: [],
		effective_permissions: [...effective],
		roles: [],
		rank: 99,
		tier: 'user',
		...overrides
	};
}

export const OWNER = caps(TENANT_ADMIN_EFFECTIVE, { tier: 'owner', rank: 0 });
export const NEW_TENANT_ADMIN = caps(TENANT_ADMIN_EFFECTIVE, {
	tier: 'admin',
	rank: 5
});
export const EXISTING_ADMIN_READ_BUNDLE = caps(
	[
		P.identityTenantsView,
		P.identityUsersView,
		P.identityRolesView,
		P.crmLeadsRead,
		P.ordersQuotationsRead
	],
	{ tier: 'admin', rank: 8 }
);
export const SALES_MANAGER = caps(
	[
		P.crmLeadsRead,
		P.crmLeadsReadAll,
		P.crmLeadsAssign,
		P.crmLeadsManage,
		P.ordersOrdersRead,
		P.ordersOrdersManage,
		P.ordersQuotationsRead,
		P.ordersQuotationsManage,
		P.inventoryCatalogRead,
		P.identityUsersView,
		P.identityRolesApprove,
		P.identityMetaRequestPermissionElevation,
		P.tasksRead,
		P.tasksReadAll,
		P.notificationsRead
	],
	{ tier: 'manager', rank: 15 }
);
export const TEAM_LEAD = caps(
	[
		P.crmLeadsRead,
		P.crmLeadsManage,
		P.ordersOrdersRead,
		P.identityRolesApprove,
		P.identityMetaRequestPermissionElevation
	],
	{ tier: 'team_lead', rank: 25 }
);
export const SALES_EXECUTIVE = caps(
	[
		P.crmLeadsRead,
		P.crmLeadsManage,
		P.ordersQuotationsRead,
		P.ordersQuotationsManage,
		P.inventoryCatalogRead,
		P.identityMetaRequestPermissionElevation
	],
	{ tier: 'user', rank: 40 }
);
export const OPERATOR_ONE_PERMISSION = caps([P.platformTenantsView], {
	is_platform: true,
	tenant_slug: 'platform'
});
export const SUPER_USER = caps(ALL_PERMISSIONS, {
	is_platform: true,
	is_super_user: true,
	tenant_slug: 'platform'
});
