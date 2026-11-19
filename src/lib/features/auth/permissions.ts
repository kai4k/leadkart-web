/**
 * Go's permission catalogue, as far as the web checks it
 * (leadkart-go internal/identity/domain/permission/permission.go).
 *
 * The one place a permission name is spelled in the web's authorisation
 * code: components, nav config and guards say `P.crmLeadsRead`, never a
 * string. `tests/unit/features/auth/permissions.test.ts` fails when a name
 * here is not in the catalogue list (`roles/permissions-catalogue.ts`), and
 * (with a Go checkout) when that list drifts from Go's file at the commit
 * pinned in `src/lib/api/generated/SOURCE.json`.
 */
export const P = {
	// Meta. `tenant.admin` is never checked by the web: Go expands what it implies into
	// `effective_permissions`, so only the concrete names are tested.
	identityMetaRequestPermissionElevation: 'identity.meta.request_permission_elevation',

	// Platform operators.
	platformTenantsView: 'platform.tenants.view',
	platformTenantsCreate: 'platform.tenants.create',
	platformTenantsManage: 'platform.tenants.manage',
	platformUsersView: 'platform.users.view',
	platformUsersCreate: 'platform.users.create',
	platformUsersManage: 'platform.users.manage',
	platformRolesView: 'platform.roles.view',
	platformRolesManage: 'platform.roles.manage',
	platformImpersonationManage: 'platform.impersonation.manage',
	platformMarketplacePurchase: 'platform.marketplace.purchase',

	// Tenants (tenant-lifecycle names are platform-reserved: Go never implies them).
	identityTenantsView: 'identity.tenants.view',
	identityTenantsUpdate: 'identity.tenants.update',
	identityTenantsUpdateSettings: 'identity.tenants.update_settings',
	identityTenantsSuspend: 'identity.tenants.suspend',
	identityTenantsActivate: 'identity.tenants.activate',
	identityTenantsDelete: 'identity.tenants.delete',

	// Users.
	identityUsersView: 'identity.users.view',
	identityUsersCreate: 'identity.users.create',
	identityUsersUpdate: 'identity.users.update',
	identityUsersDeactivate: 'identity.users.deactivate',
	identityUsersReactivate: 'identity.users.reactivate',
	identityUsersUnlock: 'identity.users.unlock',
	identityUsersAnonymise: 'identity.users.anonymise',
	identityUsersUpdatePermissions: 'identity.users.update_permissions',

	// Roles.
	identityRolesView: 'identity.roles.view',
	identityRolesCreate: 'identity.roles.create',
	identityRolesUpdate: 'identity.roles.update',
	identityRolesDelete: 'identity.roles.delete',
	identityRolesAssign: 'identity.roles.assign',
	identityRolesRevoke: 'identity.roles.revoke',
	identityRolesApprove: 'identity.roles.approve',

	// CRM.
	crmLeadsRead: 'crm.leads.read',
	crmLeadsReadAll: 'crm.leads.read_all',
	crmLeadsAssign: 'crm.leads.assign',
	crmLeadsManage: 'crm.leads.manage',

	// Orders.
	ordersQuotationsRead: 'orders.quotations.read',
	ordersQuotationsManage: 'orders.quotations.manage',
	ordersOrdersRead: 'orders.orders.read',
	ordersOrdersManage: 'orders.orders.manage',
	ordersInvoicesRead: 'orders.invoices.read',
	ordersPaymentsRead: 'orders.payments.read',
	ordersPaymentsRecord: 'orders.payments.record',

	// Inventory.
	inventoryCatalogRead: 'inventory.catalog.read',
	inventoryCatalogManage: 'inventory.catalog.manage',
	inventoryStockRead: 'inventory.stock.read',
	inventoryStockManage: 'inventory.stock.manage',

	// Dispatch.
	dispatchRead: 'dispatch.consignment_notes.read',
	dispatchManage: 'dispatch.consignment_notes.manage',

	// Tasks.
	tasksRead: 'tasks.work_items.read',
	tasksReadAll: 'tasks.work_items.read_all',
	tasksManage: 'tasks.work_items.manage',
	tasksReassign: 'tasks.work_items.reassign',

	// Notifications.
	notificationsRead: 'notifications.inbox.read',
	notificationsManage: 'notifications.inbox.manage'
} as const;

export type Permission = (typeof P)[keyof typeof P];

/**
 * Go answers `tenant_scope_read_only` to every write in these modules while an
 * operator acts in another tenant (X-Tenant-Id set), and `tenant_scope_not_supported`
 * to the permission-request routes and lead purchase. A permission blocked here is
 * not usable in tenant context even when the operator holds it.
 */
const SCOPE_READ_ONLY_MODULES: ReadonlySet<string> = new Set([
	'crm',
	'orders',
	'inventory',
	'dispatch',
	'tasks'
]);
const SCOPE_UNSUPPORTED: ReadonlySet<string> = new Set([
	P.identityMetaRequestPermissionElevation,
	P.identityRolesApprove,
	P.platformMarketplacePurchase
]);

export function isBlockedInTenantContext(permission: string): boolean {
	if (SCOPE_UNSUPPORTED.has(permission)) return true;
	const parts = permission.split('.');
	const action = parts[parts.length - 1];
	return SCOPE_READ_ONLY_MODULES.has(parts[0] ?? '') && action !== 'read' && action !== 'read_all';
}
