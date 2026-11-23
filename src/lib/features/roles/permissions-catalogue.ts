/**
 * Frontend mirror of the backend's IdentityPermissions catalogue
 * (internal/identity/domain/permission/permission.go) — every name Go
 * recognises, nothing else.
 *
 * `tests/unit/features/auth/permissions.test.ts` compares this list with
 * Go's file at the commit pinned in src/lib/api/generated/SOURCE.json
 * (skipped, with a notice, when no Go checkout is present) and checks that
 * every name in the web's `P` map is here. When the backend ships
 * GET /v1/permissions, replace this with a runtime fetch.
 *
 * Each permission has:
 *   - name: the wire identifier (e.g. "identity.users.view")
 *   - description: human-readable, shown in Tooltip on hover
 *   - group: top-level namespace for tree grouping
 */
export type PermissionCatalogueEntry = {
	name: string;
	description: string;
	group: string;
};

export const PERMISSION_CATALOGUE: ReadonlyArray<PermissionCatalogueEntry> = [
	// --- Meta ---
	{ name: 'tenant.admin', description: 'Holder is a tenant administrator', group: 'meta' },
	{
		name: 'identity.meta.request_permission_elevation',
		description: 'Ask a manager for more permissions',
		group: 'meta'
	},

	// --- Platform (cross-tenant operator) ---
	{ name: 'platform.tenants.view', description: 'Read any tenant', group: 'platform' },
	{ name: 'platform.tenants.create', description: 'Register a new tenant', group: 'platform' },
	{
		name: 'platform.tenants.manage',
		description: 'Edit any tenant (profile, statutory, settings)',
		group: 'platform'
	},
	{
		name: 'platform.tenants.ownership',
		description: 'Change who owns a tenant (owner role, tenant.admin, owner deactivation)',
		group: 'platform'
	},
	{ name: 'platform.users.view', description: 'Read any Person record', group: 'platform' },
	{ name: 'platform.users.create', description: 'Create platform users', group: 'platform' },
	{
		name: 'platform.users.manage',
		description: 'Edit, globally suspend and lift persons',
		group: 'platform'
	},
	{ name: 'platform.roles.view', description: 'Read platform-tenant roles', group: 'platform' },
	{ name: 'platform.roles.manage', description: 'Manage platform-tenant roles', group: 'platform' },
	{
		name: 'platform.impersonation.manage',
		description: 'Open, list and end impersonation sessions',
		group: 'platform'
	},
	{
		name: 'platform.unverified_contacts.manage',
		description: 'Run the unverified-contact verification pipeline',
		group: 'platform'
	},
	{
		name: 'platform.marketplace.browse',
		description: 'Browse leads on the marketplace',
		group: 'platform'
	},
	{
		name: 'platform.marketplace.purchase',
		description: 'Buy marketplace leads with credits',
		group: 'platform'
	},
	{
		name: 'platform.lead_credits.read',
		description: 'Read the lead-credit balance',
		group: 'platform'
	},
	{
		name: 'platform.lead_credits.topup',
		description: 'Credit a tenant lead-credit balance',
		group: 'platform'
	},

	// --- Identity (tenant-scoped) ---
	{ name: 'identity.tenants.view', description: "View own tenant's settings", group: 'identity' },
	{
		name: 'identity.tenants.update',
		description: 'Update profile / contact / statutory',
		group: 'identity'
	},
	{
		name: 'identity.tenants.update_settings',
		description: 'Update password policy and security settings',
		group: 'identity'
	},
	{
		name: 'identity.tenants.suspend',
		description: 'Suspend a tenant (platform operators)',
		group: 'identity'
	},
	{
		name: 'identity.tenants.activate',
		description: 'Lift a tenant suspension (platform operators)',
		group: 'identity'
	},
	{
		name: 'identity.tenants.delete',
		description: 'Mark for deletion, restore and hard-delete a tenant (platform operators)',
		group: 'identity'
	},

	{ name: 'identity.users.view', description: 'List + view team members', group: 'identity' },
	{ name: 'identity.users.create', description: 'Invite new members', group: 'identity' },
	{ name: 'identity.users.update', description: 'Edit profile / set manager', group: 'identity' },
	{ name: 'identity.users.deactivate', description: 'Suspend a member', group: 'identity' },
	{ name: 'identity.users.reactivate', description: 'Lift a member suspension', group: 'identity' },
	{ name: 'identity.users.unlock', description: 'Clear login lockouts', group: 'identity' },
	{
		name: 'identity.users.anonymise',
		description: 'DPDP anonymisation (irreversible)',
		group: 'identity'
	},
	{
		name: 'identity.users.update_permissions',
		description: 'Override role-default permissions per user',
		group: 'identity'
	},

	{ name: 'identity.roles.view', description: 'List + view roles', group: 'identity' },
	{ name: 'identity.roles.create', description: 'Create custom roles', group: 'identity' },
	{
		name: 'identity.roles.update',
		description: 'Edit role names + permissions',
		group: 'identity'
	},
	{ name: 'identity.roles.delete', description: 'Remove custom roles', group: 'identity' },
	{ name: 'identity.roles.assign', description: 'Assign a role to a user', group: 'identity' },
	{ name: 'identity.roles.revoke', description: 'Remove a role from a user', group: 'identity' },
	{
		name: 'identity.roles.approve',
		description: 'Approve permission-elevation requests from direct reports',
		group: 'identity'
	},

	// --- CRM ---
	{ name: 'crm.leads.read', description: 'View assigned leads', group: 'crm' },
	{ name: 'crm.leads.read_all', description: 'View every lead in the tenant', group: 'crm' },
	{ name: 'crm.leads.assign', description: 'Assign leads to members', group: 'crm' },
	{
		name: 'crm.leads.manage',
		description: 'Move, call, convert and lose leads; set reminders',
		group: 'crm'
	},

	// --- Inventory ---
	{ name: 'inventory.catalog.read', description: 'View the product catalogue', group: 'inventory' },
	{
		name: 'inventory.catalog.manage',
		description: 'Create, edit and delete products',
		group: 'inventory'
	},
	{
		name: 'inventory.stock.read',
		description: 'View batches and stock movements',
		group: 'inventory'
	},
	{
		name: 'inventory.stock.manage',
		description: 'Add batches and record stock movements',
		group: 'inventory'
	},

	// --- Tasks ---
	{ name: 'tasks.work_items.read', description: 'View own tasks', group: 'tasks' },
	{ name: 'tasks.work_items.read_all', description: "View the team's tasks", group: 'tasks' },
	{ name: 'tasks.work_items.manage', description: 'Create and update own tasks', group: 'tasks' },
	{
		name: 'tasks.work_items.reassign',
		description: 'Move a task to another member',
		group: 'tasks'
	},

	// --- Dispatch ---
	{
		name: 'dispatch.consignment_notes.read',
		description: 'View consignment notes',
		group: 'dispatch'
	},
	{
		name: 'dispatch.consignment_notes.manage',
		description: 'Create consignment notes and drive carrier status',
		group: 'dispatch'
	},

	// --- Orders ---
	{ name: 'orders.quotations.read', description: 'View quotations', group: 'orders' },
	{
		name: 'orders.quotations.manage',
		description: 'Create, revise, approve and reject quotations',
		group: 'orders'
	},
	{ name: 'orders.orders.read', description: 'View orders', group: 'orders' },
	{
		name: 'orders.orders.manage',
		description: 'Confirm, pack, invoice, cancel and complete orders',
		group: 'orders'
	},
	{ name: 'orders.payments.read', description: 'View payments', group: 'orders' },
	{ name: 'orders.payments.record', description: 'Record a payment receipt', group: 'orders' },
	{ name: 'orders.invoices.read', description: 'View invoices and credit notes', group: 'orders' },

	// --- Notifications ---
	{
		name: 'notifications.inbox.read',
		description: 'Read own notifications',
		group: 'notifications'
	},
	{
		name: 'notifications.inbox.manage',
		description: 'Mark own notifications read or dismissed',
		group: 'notifications'
	}
];

/**
 * Go's `platformReserved` (internal/identity/domain/permission/implication.go): names `tenant.admin` never implies.
 * Nobody but a super user may put one on a role or grant one (`authority.mayChangePermissions`:
 * "platform-reserved"), and none can be asked for in a permission request (`permission.IsRequestable`).
 * `tenant.admin` is in the list: only an owner confers it. Held against Go's file in
 * `tests/unit/features/auth/permissions.test.ts`.
 */
export const PLATFORM_RESERVED: ReadonlySet<string> = new Set([
	'tenant.admin',
	'platform.tenants.view',
	'platform.tenants.create',
	'platform.tenants.manage',
	'platform.users.view',
	'platform.users.create',
	'platform.users.manage',
	'platform.roles.view',
	'platform.roles.manage',
	'platform.impersonation.manage',
	'platform.tenants.ownership',
	'platform.unverified_contacts.manage',
	'platform.lead_credits.topup',
	'identity.tenants.suspend',
	'identity.tenants.activate',
	'identity.tenants.delete',
	'identity.users.anonymise'
]);

/** The names a member may ask for in a permission request: the catalogue minus the platform-reserved ones. */
export const requestablePermissions = (): PermissionCatalogueEntry[] =>
	PERMISSION_CATALOGUE.filter((entry) => !PLATFORM_RESERVED.has(entry.name));

/**
 * The names of a role's permission tree the caller may not change, by name -> why. Go decides per CHANGED name
 * (`authority.mayChangePermissions`): a platform-reserved one is refused to everyone but a super user, and any other
 * must be held by the caller; one refused name fails the whole save without saying which. `holds` is the session's own
 * rule (`session.can`), which already holds everything for a super user, so a name it holds is never refused here.
 */
export function unchangeablePermissions(
	holds: (name: string) => boolean,
	reasons: { reserved: string; notHeld: string }
): Record<string, string> {
	const refused: Record<string, string> = {};
	for (const { name } of PERMISSION_CATALOGUE) {
		if (holds(name)) continue;
		refused[name] = PLATFORM_RESERVED.has(name) ? reasons.reserved : reasons.notHeld;
	}
	return refused;
}

/**
 * Group catalogue entries by their top-level `group` field for tree rendering.
 */
export function groupedCatalogue(): Map<string, PermissionCatalogueEntry[]> {
	const groups = new Map<string, PermissionCatalogueEntry[]>();
	for (const entry of PERMISSION_CATALOGUE) {
		const bucket = groups.get(entry.group) ?? [];
		bucket.push(entry);
		groups.set(entry.group, bucket);
	}
	return groups;
}
