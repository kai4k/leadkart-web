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
 * While an operator acts in another tenant (X-Tenant-Id set) Go answers:
 *   - `tenant_scope_read_only` to every WRITE of crm / orders / tasks / dispatch / inventory;
 *   - 403 `forbidden` to every READ of those modules and to `platform.lead_credits.read` for a
 *     NON-super operator (they hold no platform equivalent of those names): only a super user
 *     reads them in another tenant;
 *   - `tenant_scope_not_supported` to the permission-request routes and lead purchase.
 * A permission blocked here is not usable in tenant context even when the operator holds it.
 *
 * `isSuperUser` is the ONE place the web looks at that flag, because it is Go's literal rule for
 * those reads (the `is_super_user` of the caller's own capabilities); nowhere else is it an
 * authorisation input.
 */
const SCOPE_MODULES: ReadonlySet<string> = new Set([
	'crm',
	'orders',
	'inventory',
	'dispatch',
	'tasks'
]);
const NON_SUPER_BLOCKED_READS: ReadonlySet<string> = new Set(['platform.lead_credits.read']);
const SCOPE_UNSUPPORTED: ReadonlySet<string> = new Set([
	P.identityMetaRequestPermissionElevation,
	P.identityRolesApprove,
	P.platformMarketplacePurchase
]);

export function isBlockedInTenantContext(permission: string, isSuperUser = false): boolean {
	if (SCOPE_UNSUPPORTED.has(permission)) return true;
	const parts = permission.split('.');
	const action = parts[parts.length - 1];
	if (!SCOPE_MODULES.has(parts[0] ?? '')) {
		return !isSuperUser && NON_SUPER_BLOCKED_READS.has(permission);
	}
	const isRead = action === 'read' || action === 'read_all';
	return isRead ? !isSuperUser : true;
}

/**
 * What each identity action needs, as an any-of list, straight from Go's route gates
 * (`internal/identity/ports/http.go`). Go satisfies an `identity.*` gate with the matching
 * `platform.*` equivalents for operators (ADR 0068), and an operator acting in a tenant holds
 * only the `platform.*` names, so a list carries both. Tenant users never hold `platform.*`
 * (Go keeps them reserved), so the same list is right in either context: no context switch,
 * no tier, rank or role test. A permitted caller can still be refused per target
 * (`insufficient_rank`, `grant_exceeds_authority`, ...): the UI shows the action and renders
 * Go's refusal.
 *
 * Use as `session.canAny(...ACTION.userCreate)`; the server side checks a single route's
 * permission with `authoriseAction`.
 */
export const ACTION = {
	/** List / read members (also the roster behind a role's member count). */
	userView: [P.identityUsersView, P.platformUsersView, P.platformUsersManage],
	userCreate: [P.identityUsersCreate, P.platformUsersCreate, P.platformUsersManage],
	/** Profile edit, set / remove manager. */
	userUpdate: [P.identityUsersUpdate, P.platformUsersManage],
	userDeactivate: [P.identityUsersDeactivate, P.platformUsersManage],
	userReactivate: [P.identityUsersReactivate, P.platformUsersManage],
	userOverrides: [P.identityUsersUpdatePermissions, P.platformUsersManage],
	roleAssign: [P.identityRolesAssign, P.platformRolesManage],
	roleRevoke: [P.identityRolesRevoke, P.platformRolesManage],
	roleCreate: [P.identityRolesCreate, P.platformRolesManage],
	/** Rename / re-level, permissions replace / grant / revoke, parent. */
	roleUpdate: [P.identityRolesUpdate, P.platformRolesManage],
	roleDelete: [P.identityRolesDelete, P.platformRolesManage],
	/** Submit a permission request (own tenant only: Go refuses the route in tenant context). */
	requestSubmit: [P.identityMetaRequestPermissionElevation],
	/** Approve / deny. Go decides per request by the authority policy; this holds the permission. */
	requestDecide: [P.identityRolesApprove]
} as const satisfies Record<string, readonly string[]>;
