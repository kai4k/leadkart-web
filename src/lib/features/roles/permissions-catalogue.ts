/**
 * Frontend mirror of the backend's IdentityPermissions catalogue
 * (internal/identity/domain/permission/permission.go).
 *
 * MUST be kept in sync with the Go constants. When the backend ships
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

	// --- Platform (cross-tenant operator) ---
	{ name: 'platform.tenants.view', description: 'Read any tenant', group: 'platform' },
	{ name: 'platform.tenants.create', description: 'Register a new tenant', group: 'platform' },
	{
		name: 'platform.tenants.manage',
		description: 'Suspend/activate/delete tenants',
		group: 'platform'
	},
	{ name: 'platform.users.view', description: 'Read any Person record', group: 'platform' },
	{ name: 'platform.users.create', description: 'Create platform users', group: 'platform' },
	{
		name: 'platform.users.manage',
		description: 'Global suspend / anonymise persons',
		group: 'platform'
	},
	{ name: 'platform.roles.view', description: 'Read platform-tenant roles', group: 'platform' },
	{ name: 'platform.roles.manage', description: 'Manage platform-tenant roles', group: 'platform' },

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
		description: 'Self-suspend the tenant (cooling off)',
		group: 'identity'
	},
	{ name: 'identity.tenants.activate', description: 'Lift a self-suspension', group: 'identity' },
	{
		name: 'identity.tenants.delete',
		description: 'Mark the tenant for deletion',
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
	{ name: 'identity.roles.revoke', description: 'Remove a role from a user', group: 'identity' }

	// Other modules (CRM, Orders, Inventory, etc.) — add when those slices land.
];

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
