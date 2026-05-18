# Slice 3 — Tenant roles management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Ship tenant-admin role-management surface — list roles, create / rename / set-hierarchy, edit permission catalogue (grant/revoke, atomic replace), delete custom roles — wired to real backend endpoints. Introduces the `Tooltip` primitive and the bespoke `PermissionTree` (no Domiex anchor).

**Architecture:** New feature `lib/features/roles/` mirroring `lib/features/users/`. Routes `/settings/roles` (list) + `/settings/roles/[id]` (detail editor). Reuses Drawer/Dialog/Dropdown/Pagination/Avatar/EmptyState primitives extracted in slice 2.

**Tech Stack:** Same as slices 1-2. bits-ui Tooltip lands here.

**Spec reference:** `docs/superpowers/specs/2026-05-18-identity-module-completion-design.md` §5.3.

**Permission catalogue source:** the backend has a closed catalogue in `internal/identity/domain/permission/permission.go` but does NOT expose a discovery endpoint. Slice 3 mirrors the catalogue as a frontend constant. **OPEN: when backend adds `GET /v1/permissions`, replace the constant.**

---

## Backend contract

```
GET    /api/v1/roles                                   → { roles: RoleDto[] }                auth + identity.roles.view
GET    /api/v1/roles/{id}                              → RoleDto                              auth + identity.roles.view
POST   /api/v1/roles                                   → { role_id }                          auth + identity.roles.create
                                                        body: { name, hierarchy_level }
PATCH  /api/v1/roles/{id}                              → 204                                  auth + identity.roles.update
                                                        body: { name?, hierarchy_level? }
PUT    /api/v1/roles/{id}/permissions                  → 204                                  auth + identity.roles.update
                                                        body: { permissions: string[] }       (atomic replace)
POST   /api/v1/roles/{id}/permissions/grant            → 204                                  auth + identity.roles.update
                                                        body: { permission }                  (delta)
POST   /api/v1/roles/{id}/permissions/revoke           → 204                                  auth + identity.roles.update
                                                        body: { permission }                  (delta)
DELETE /api/v1/roles/{id}                              → 204                                  auth + identity.roles.delete
```

`RoleDto`, `listRolesResponseSchema` already in `lib/features/users/{schemas,types}.ts` from slice 2. **Move them to `lib/features/roles/`** as their canonical location, and re-export from users so slice 2's role-assignment drawer doesn't break.

---

## File map

**Create:**

- `src/lib/features/roles/api.ts`
- `src/lib/features/roles/schemas.ts` (move from users)
- `src/lib/features/roles/types.ts` (move from users)
- `src/lib/features/roles/permissions-catalogue.ts` (frontend mirror of `permission.go`)
- `src/lib/features/roles/view-models.ts`
- `src/lib/features/roles/stores/roles.svelte.ts`
- `src/lib/features/roles/components/RolesList.svelte`
- `src/lib/features/roles/components/CreateRoleDrawer.svelte`
- `src/lib/features/roles/components/DeleteRoleDialog.svelte`
- `src/lib/features/roles/components/PermissionTree.svelte`
- `src/lib/components/ui/tooltip/{Tooltip,TooltipTrigger,TooltipContent}.svelte` + `index.ts`
- `src/routes/(app)/settings/roles/+page.svelte`
- `src/routes/(app)/settings/roles/+page.ts`
- `src/routes/(app)/settings/roles/[id]/+page.svelte`
- `src/routes/(app)/settings/roles/[id]/+page.ts`
- `tests/unit/features/roles/{schemas,view-models}.test.ts`
- `tests/e2e/tenant-roles-management.spec.ts`

**Modify:**

- `src/lib/features/users/schemas.ts` — drop the roleDtoSchema + listRolesResponseSchema declarations, re-export from `$lib/features/roles/schemas` instead (so slice 2's RoleAssignmentDrawer + UsersStore.load() still work via the same import path)
- `src/lib/features/users/types.ts` — same: re-export RoleDto + ListRolesResponse from roles types
- `src/lib/features/users/api.ts` — change `listRoles()` to delegate to `$features/roles/api`'s `listRoles()`. Or, alternatively, leave it duplicated — the call is one line. Pick: delegate (DRY) so there's one place maintaining the call.
- `src/lib/components/ui/index.ts` — add `export * as Tooltip from './tooltip';`

---

## Task list

### Task 1: Move RoleDto schemas + types from users to roles feature

**Files:**

- Create `src/lib/features/roles/schemas.ts`, `src/lib/features/roles/types.ts`
- Modify `src/lib/features/users/schemas.ts`, `src/lib/features/users/types.ts`

- [ ] **Step 1: Create roles/schemas.ts**

```ts
/**
 * Zod schemas for the tenant role-management feature.
 */
import { z } from 'zod';

export const roleDtoSchema = z.object({
	id: z.string(),
	tenant_id: z.string(),
	name: z.string(),
	is_system_default: z.boolean(),
	is_super_admin: z.boolean(),
	hierarchy_level: z.number().int(),
	permissions: z.array(z.string()),
	created_at: z.string(),
	updated_at: z.string()
});

export const listRolesResponseSchema = z.object({ roles: z.array(roleDtoSchema) });

export const createRoleRequestSchema = z
	.object({
		name: z.string().min(3).max(100),
		hierarchy_level: z.number().int().min(0).max(100)
	})
	.strict();

export const createRoleResponseSchema = z.object({ role_id: z.string() });

export const updateRoleRequestSchema = z
	.object({
		name: z.string().min(3).max(100).optional(),
		hierarchy_level: z.number().int().min(0).max(100).optional()
	})
	.strict();

export const replaceRolePermissionsRequestSchema = z
	.object({ permissions: z.array(z.string()) })
	.strict();

export const rolePermissionRequestSchema = z.object({ permission: z.string() }).strict();
```

- [ ] **Step 2: Create roles/types.ts**

```ts
import type { z } from 'zod';
import type {
	roleDtoSchema,
	listRolesResponseSchema,
	createRoleRequestSchema,
	createRoleResponseSchema,
	updateRoleRequestSchema,
	replaceRolePermissionsRequestSchema,
	rolePermissionRequestSchema
} from './schemas';

export type RoleDto = z.output<typeof roleDtoSchema>;
export type ListRolesResponse = z.output<typeof listRolesResponseSchema>;
export type CreateRoleRequest = z.output<typeof createRoleRequestSchema>;
export type CreateRoleResponse = z.output<typeof createRoleResponseSchema>;
export type UpdateRoleRequest = z.output<typeof updateRoleRequestSchema>;
export type ReplaceRolePermissionsRequest = z.output<typeof replaceRolePermissionsRequestSchema>;
export type RolePermissionRequest = z.output<typeof rolePermissionRequestSchema>;
```

- [ ] **Step 3: Update users/schemas.ts**

Remove the local roleDtoSchema + listRolesResponseSchema declarations. Replace with re-exports:

```ts
export { roleDtoSchema, listRolesResponseSchema } from '$lib/features/roles/schemas';
```

- [ ] **Step 4: Update users/types.ts**

Same pattern — remove local type aliases, re-export:

```ts
export type { RoleDto, ListRolesResponse } from '$lib/features/roles/types';
```

- [ ] **Step 5: Verify**

Run `npm run check && npm run test`. Both must pass — users-feature tests for role schemas should still pass through the re-export.

- [ ] **Step 6: Commit**

```bash
git add src/lib/features/roles/schemas.ts src/lib/features/roles/types.ts \
  src/lib/features/users/schemas.ts src/lib/features/users/types.ts
git commit -m "refactor(roles): move RoleDto schemas + types to roles feature

Slice 2 prototyped role schemas inside the users feature; slice 3
moves them to the canonical roles feature module and back-exports
from users so existing call sites keep working. Adds the four
new role-mutation request/response schemas slice 3 needs."
```

---

### Task 2: Frontend permission catalogue

**Files:** Create `src/lib/features/roles/permissions-catalogue.ts`

This is a frontend mirror of `internal/identity/domain/permission/permission.go` so the PermissionTree can render the hierarchy without a server round-trip. Open question to flag: backend should eventually expose `GET /v1/permissions` — until then this constant must be kept in sync manually.

- [ ] **Step 1: Inspect the backend file**

Read `d:/Development/leadkart-go/internal/identity/domain/permission/permission.go` to capture the exact permission strings.

- [ ] **Step 2: Implement**

```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/features/roles/permissions-catalogue.ts
git commit -m "feat(roles): frontend permission catalogue (mirror of backend)

Hardcoded mirror of internal/identity/domain/permission/permission.go.
Each entry has name, description (shown in Tooltip), and group
namespace for tree rendering. Will be replaced by a runtime
fetch when backend ships GET /v1/permissions."
```

---

### Task 3: roles gateway

**Files:** Create `src/lib/features/roles/api.ts`

- [ ] **Step 1: Implement**

```ts
import { api } from '$api/client';
import { listRolesResponseSchema, roleDtoSchema, createRoleResponseSchema } from './schemas';
import type {
	ListRolesResponse,
	RoleDto,
	CreateRoleRequest,
	CreateRoleResponse,
	UpdateRoleRequest,
	ReplaceRolePermissionsRequest,
	RolePermissionRequest
} from './types';

export async function listRoles(): Promise<ListRolesResponse> {
	const raw = await api.get<unknown>('/v1/roles');
	return listRolesResponseSchema.parse(raw);
}

export async function getRole(roleId: string): Promise<RoleDto> {
	const raw = await api.get<unknown>(`/v1/roles/${roleId}`);
	return roleDtoSchema.parse(raw);
}

export async function createRole(req: CreateRoleRequest): Promise<CreateRoleResponse> {
	const raw = await api.post<unknown>('/v1/roles', req);
	return createRoleResponseSchema.parse(raw);
}

export async function updateRole(roleId: string, req: UpdateRoleRequest): Promise<void> {
	await api.patch<void>(`/v1/roles/${roleId}`, req);
}

export async function replaceRolePermissions(
	roleId: string,
	req: ReplaceRolePermissionsRequest
): Promise<void> {
	await api.put<void>(`/v1/roles/${roleId}/permissions`, req);
}

export async function grantRolePermission(
	roleId: string,
	req: RolePermissionRequest
): Promise<void> {
	await api.post<void>(`/v1/roles/${roleId}/permissions/grant`, req);
}

export async function revokeRolePermission(
	roleId: string,
	req: RolePermissionRequest
): Promise<void> {
	await api.post<void>(`/v1/roles/${roleId}/permissions/revoke`, req);
}

export async function deleteRole(roleId: string): Promise<void> {
	await api.delete<void>(`/v1/roles/${roleId}`);
}
```

Also update `src/lib/features/users/api.ts` — change `listRoles` to delegate:

```ts
// Replace the inline listRoles impl with:
export { listRoles } from '$features/roles/api';
```

- [ ] **Step 2: Verify + commit**

`npm run check && npm run test` pass.

```bash
git add src/lib/features/roles/api.ts src/lib/features/users/api.ts
git commit -m "feat(roles): gateway for role + permission mutations

8 typed wrappers — list/get/create/update/delete + replace/grant/
revoke permissions. users feature now delegates listRoles() to
the canonical implementation here (DRY)."
```

---

### Task 4: RolesStore

**Files:** Create `src/lib/features/roles/stores/roles.svelte.ts`

- [ ] **Step 1: Implement** (mirror UsersStore pattern from slice 2)

```ts
import {
	listRoles,
	getRole,
	createRole as createRoleApi,
	updateRole as updateRoleApi,
	replaceRolePermissions as replaceRolePermissionsApi,
	grantRolePermission as grantRolePermissionApi,
	revokeRolePermission as revokeRolePermissionApi,
	deleteRole as deleteRoleApi
} from '$features/roles/api';
import type {
	RoleDto,
	CreateRoleRequest,
	CreateRoleResponse,
	UpdateRoleRequest
} from '$features/roles/types';

export type RolesStatus = 'idle' | 'loading' | 'ready' | 'mutating' | 'error';

export class RolesStore {
	list = $state<RoleDto[]>([]);
	status = $state<RolesStatus>('idle');
	error = $state<string | null>(null);

	async load(): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			const { roles } = await listRoles();
			this.list = roles;
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load roles';
		}
	}

	async refresh(): Promise<void> {
		try {
			const { roles } = await listRoles();
			this.list = roles;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to refresh roles';
		}
	}

	async create(req: CreateRoleRequest): Promise<CreateRoleResponse> {
		this.status = 'mutating';
		try {
			const resp = await createRoleApi(req);
			await this.refresh();
			this.status = 'ready';
			return resp;
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to create role';
			throw e;
		}
	}

	async update(roleId: string, req: UpdateRoleRequest): Promise<void> {
		await this.mutate(() => updateRoleApi(roleId, req), roleId);
	}

	async setPermissions(roleId: string, permissions: string[]): Promise<void> {
		await this.mutate(() => replaceRolePermissionsApi(roleId, { permissions }), roleId);
	}

	async grantPermission(roleId: string, permission: string): Promise<void> {
		await this.mutate(() => grantRolePermissionApi(roleId, { permission }), roleId);
	}

	async revokePermission(roleId: string, permission: string): Promise<void> {
		await this.mutate(() => revokeRolePermissionApi(roleId, { permission }), roleId);
	}

	async delete(roleId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await deleteRoleApi(roleId);
			this.list = this.list.filter((r) => r.id !== roleId);
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to delete role';
			throw e;
		}
	}

	reset(): void {
		this.list = [];
		this.status = 'idle';
		this.error = null;
	}

	private async mutate(op: () => Promise<void>, roleId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await op();
			const fresh = await getRole(roleId);
			const idx = this.list.findIndex((r) => r.id === roleId);
			if (idx >= 0) {
				const next = this.list.slice();
				next[idx] = fresh;
				this.list = next;
			}
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Operation failed';
			throw e;
		}
	}
}

export const roles = new RolesStore();
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/features/roles/stores/roles.svelte.ts
git commit -m "feat(roles): RolesStore class for role + permission state

Mirrors UsersStore pattern from slice 2. CRUD + permission delta
(grant/revoke) + atomic replace (setPermissions). Single-row
refresh after mutation via getRole."
```

---

### Task 5: View-models

**Files:** Create `src/lib/features/roles/view-models.ts` + test

- [ ] **Step 1: View-models**

```ts
import type { RoleDto } from './types';

export function isProtectedRole(role: RoleDto): boolean {
	return role.is_super_admin || role.is_system_default;
}

export function roleBadgeVariant(role: RoleDto): {
	label: string;
	variant: 'brand' | 'info' | 'warning' | 'neutral';
} {
	if (role.is_super_admin) return { label: 'SuperAdmin', variant: 'warning' };
	if (role.is_system_default) return { label: 'System', variant: 'info' };
	return { label: 'Custom', variant: 'neutral' };
}

/**
 * Returns the set of permissions held by `role` from the given
 * catalogue (used for the PermissionTree's checked-state derivation).
 */
export function rolePermissionSet(role: RoleDto): Set<string> {
	return new Set(role.permissions);
}

/**
 * Member-count helper — counts active users assigned this role.
 * (Roster passed in by the caller; pure transform.)
 */
export function roleMemberCount(
	role: RoleDto,
	roster: ReadonlyArray<{ role_ids: string[]; status: string }>
): number {
	return roster.filter((u) => u.status === 'active' && u.role_ids.includes(role.id)).length;
}
```

- [ ] **Step 2: Tests + commit**

Mirror slice 2's view-model test pattern. Write minimum 5 tests covering each function. Commit:

```bash
git add src/lib/features/roles/view-models.ts tests/unit/features/roles/view-models.test.ts
git commit -m "feat(roles): view-models for badge + protection + member-count

isProtectedRole, roleBadgeVariant, rolePermissionSet,
roleMemberCount — covered by vitest."
```

---

### Task 6: Tooltip primitive

**Files:** `src/lib/components/ui/tooltip/{Tooltip,TooltipTrigger,TooltipContent}.svelte` + `index.ts` + barrel update

Built on bits-ui Tooltip. Same shape as Drawer/Dialog/Dropdown extraction.

- [ ] **Step 1: Implement**

```svelte
<!-- Tooltip.svelte (Root) -->
<script lang="ts">
	import { Tooltip as BitsTooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = { children: Snippet; delayDuration?: number };
	let { children, delayDuration = 300 }: Props = $props();
</script>

<BitsTooltip.Provider {delayDuration}>
	<BitsTooltip.Root>{@render children()}</BitsTooltip.Root>
</BitsTooltip.Provider>
```

```svelte
<!-- TooltipTrigger.svelte -->
<script lang="ts">
	import { Tooltip as BitsTooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		class: className = '',
		children,
		...rest
	}: { class?: string; children: Snippet } = $props();
</script>

<BitsTooltip.Trigger class={className} {...rest}>{@render children()}</BitsTooltip.Trigger>
```

```svelte
<!-- TooltipContent.svelte -->
<script lang="ts">
	import { Tooltip as BitsTooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = { class?: string; side?: 'top' | 'right' | 'bottom' | 'left'; children: Snippet };
	let { class: className = '', side = 'top', children }: Props = $props();
</script>

<BitsTooltip.Portal>
	<BitsTooltip.Content
		{side}
		sideOffset={6}
		class={cn(
			'glass-card label-small max-w-xs px-2 py-1 text-xs text-[var(--color-fg)]',
			'animate-fade-in',
			className
		)}
		style="z-index: var(--z-tooltip); position: fixed;"
	>
		{@render children()}
	</BitsTooltip.Content>
</BitsTooltip.Portal>
```

If `--z-tooltip` doesn't exist in tokens.css, use `--z-modal` or add it (token addition is in scope).

- [ ] **Step 2: index.ts + barrel update + commit**

```ts
// tooltip/index.ts
export { default as Root } from './Tooltip.svelte';
export { default as Trigger } from './TooltipTrigger.svelte';
export { default as Content } from './TooltipContent.svelte';
```

`ui/index.ts`: `export * as Tooltip from './tooltip';`

```bash
git add src/lib/components/ui/tooltip src/lib/components/ui/index.ts
git commit -m "feat(ui): Tooltip primitive (compound, bits-ui-backed)

Root/Trigger/Content composition. Behavior from bits-ui Tooltip
(focus, hover, delay, dismiss). Visual via .glass-card material.
First use site is PermissionTree's per-permission descriptions."
```

---

### Task 7: PermissionTree component

**Files:** `src/lib/features/roles/components/PermissionTree.svelte`

Hierarchical checkbox tree over the catalogue. No Domiex anchor — bespoke.

- [ ] **Step 1: Implement**

```svelte
<script lang="ts">
	import { Tooltip } from '$ui';
	import { Info, Icon } from '$icons';
	import {
		groupedCatalogue,
		type PermissionCatalogueEntry
	} from '$features/roles/permissions-catalogue';

	type Props = {
		selected: string[];
		disabled?: boolean;
		onChange: (next: string[]) => void;
	};

	let { selected, disabled = false, onChange }: Props = $props();

	const groups = $derived(Array.from(groupedCatalogue().entries()));

	function toggle(name: string) {
		if (disabled) return;
		const set = new Set(selected);
		if (set.has(name)) set.delete(name);
		else set.add(name);
		onChange([...set]);
	}

	function groupChecked(entries: PermissionCatalogueEntry[]): 'none' | 'some' | 'all' {
		const inGroup = entries.filter((e) => selected.includes(e.name)).length;
		if (inGroup === 0) return 'none';
		if (inGroup === entries.length) return 'all';
		return 'some';
	}

	function toggleGroup(entries: PermissionCatalogueEntry[]) {
		if (disabled) return;
		const state = groupChecked(entries);
		const set = new Set(selected);
		if (state === 'all') {
			for (const e of entries) set.delete(e.name);
		} else {
			for (const e of entries) set.add(e.name);
		}
		onChange([...set]);
	}
</script>

<div class="stack stack-relaxed" role="tree" aria-label="Permission catalogue">
	{#each groups as [group, entries] (group)}
		{@const state = groupChecked(entries)}
		<section class="stack stack-tight">
			<header class="cluster cluster-spread">
				<label class="cluster cluster-tight cursor-pointer">
					<input
						type="checkbox"
						checked={state === 'all'}
						indeterminate={state === 'some'}
						{disabled}
						onchange={() => toggleGroup(entries)}
						aria-label="Toggle all {group} permissions"
					/>
					<span class="h6 capitalize">{group}</span>
				</label>
				<span class="caption text-[var(--color-fg-muted)]">
					{entries.filter((e) => selected.includes(e.name)).length} / {entries.length}
				</span>
			</header>
			<ul class="stack stack-tight pl-6" role="group">
				{#each entries as entry (entry.name)}
					<li class="cluster cluster-tight">
						<label class="cluster cluster-tight flex-1 cursor-pointer">
							<input
								type="checkbox"
								checked={selected.includes(entry.name)}
								{disabled}
								onchange={() => toggle(entry.name)}
								aria-label={entry.name}
							/>
							<span class="label font-mono text-xs text-[var(--color-fg)]">{entry.name}</span>
						</label>
						<Tooltip.Root>
							<Tooltip.Trigger
								class="text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-muted)]"
							>
								<Icon icon={Info} size="sm" />
							</Tooltip.Trigger>
							<Tooltip.Content>{entry.description}</Tooltip.Content>
						</Tooltip.Root>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
```

Ensure `Info` icon is exported from `$icons` (lucide-svelte). Add if missing.

- [ ] **Step 2: Commit**

```bash
git add src/lib/features/roles/components/PermissionTree.svelte src/lib/icons/index.ts
git commit -m "feat(roles): PermissionTree — grouped checkbox tree

Bespoke component (no Domiex anchor). Renders the frontend
permission catalogue grouped by namespace, each leaf with an
info-tooltip describing what the perm grants. Parent checkboxes
support indeterminate state for partial-group selection. Refs:
GitHub org permissions screen, Auth0 RBAC matrix."
```

---

### Task 8: CreateRoleDrawer + DeleteRoleDialog

**Files:** `src/lib/features/roles/components/{CreateRoleDrawer,DeleteRoleDialog}.svelte`

- [ ] **Step 1: CreateRoleDrawer** (same pattern as CreateUserDrawer)

```svelte
<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField } from '$lib/components/form';
	import { roles } from '$features/roles/stores/roles.svelte';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	let name = $state('');
	let hierarchyLevel = $state(5);
	let error = $state<string | null>(null);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		try {
			await roles.create({ name: name.trim(), hierarchy_level: hierarchyLevel });
			name = '';
			hierarchyLevel = 5;
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create role';
		}
	}

	const isPending = $derived(roles.status === 'mutating');
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Create role</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Permissions can be assigned in the role detail view after creation.
				</p>
			</div>
			<Drawer.Close>
				<button
					type="button"
					class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]"
					aria-label="Close">×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			<form id="create-role-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<TextField
					label="Name"
					name="name"
					bind:value={name}
					minlength={3}
					maxlength={100}
					required
				/>
				<label class="stack stack-tight">
					<span class="label">Hierarchy level</span>
					<input
						type="number"
						bind:value={hierarchyLevel}
						min={0}
						max={100}
						class="glass-input rounded-md px-3 py-2 text-sm"
					/>
					<span class="caption text-[var(--color-fg-subtle)]">
						0 = highest authority. Used for hierarchy-scoped operations (lead reassignment, leave
						approval).
					</span>
				</label>
				{#if error}<Alert variant="danger">{error}</Alert>{/if}
			</form>
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="create-role-form" loading={isPending}>Create role</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
```

- [ ] **Step 2: DeleteRoleDialog** — ConfirmDialog variant="danger", typed-name confirmation

```svelte
<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { roles } from '$features/roles/stores/roles.svelte';
	import type { RoleDto } from '$features/roles/types';

	type Props = { open: boolean; role: RoleDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), role, onOpenChange }: Props = $props();

	let confirmName = $state('');
	let error = $state<string | null>(null);
	const isPending = $derived(roles.status === 'mutating');
	const canConfirm = $derived(role !== null && confirmName === role.name);

	async function onConfirm() {
		if (!role || !canConfirm) return;
		error = null;
		try {
			await roles.delete(role.id);
			confirmName = '';
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete role';
		}
	}
</script>

<ConfirmDialog
	bind:open
	title="Delete {role?.name ?? 'role'}"
	description="Removes the role and unassigns it from all members. Users keep their personal permission overrides. This is permanent."
	confirmLabel="Delete role"
	variant="danger"
	loading={isPending}
	{onOpenChange}
	{onConfirm}
>
	{#snippet body()}
		<label class="stack stack-tight">
			<span class="label"
				>Type <code class="rounded bg-[var(--color-bg-muted)] px-1">{role?.name ?? ''}</code> to confirm</span
			>
			<input bind:value={confirmName} class="glass-input rounded-md px-3 py-2 text-sm" />
		</label>
		{#if error}<Alert variant="danger">{error}</Alert>{/if}
		{#if !canConfirm && confirmName.length > 0}
			<p class="caption text-[var(--color-warning-900)]">Name doesn't match.</p>
		{/if}
	{/snippet}
</ConfirmDialog>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/features/roles/components/{CreateRoleDrawer,DeleteRoleDialog}.svelte
git commit -m "feat(roles): CreateRoleDrawer + DeleteRoleDialog

Create drawer collects name + hierarchy level. Delete dialog
uses typed-name confirmation (canonical for destructive ops on
named entities — GitHub repo-delete, Vercel project-delete)."
```

---

### Task 9: RolesList

**Files:** `src/lib/features/roles/components/RolesList.svelte`

Single full-width Card row per role (per spec §5.3 — list, not grid). Each row: name, badge (Custom/System/SuperAdmin), member count, permission count, row-action Dropdown (Edit → detail page, Delete).

- [ ] **Step 1: Implement** (closely mirrors UsersList pattern)

```svelte
<script lang="ts">
	import { Alert, Badge, Button, Card, EmptyState, Pagination, Spinner, Dropdown } from '$ui';
	import { Plus, Shield, MoreVertical, Trash2, Edit, Icon } from '$icons';
	import { roles } from '$features/roles/stores/roles.svelte';
	import { users } from '$features/users/stores/users.svelte';
	import type { RoleDto } from '$features/roles/types';
	import { roleBadgeVariant, isProtectedRole, roleMemberCount } from '$features/roles/view-models';
	import CreateRoleDrawer from './CreateRoleDrawer.svelte';
	import DeleteRoleDialog from './DeleteRoleDialog.svelte';

	let createOpen = $state(false);
	let deleteOpen = $state(false);
	let targetRole = $state<RoleDto | null>(null);

	let page = $state(1);
	const pageSize = 10;
	const pageCount = $derived(Math.max(1, Math.ceil(roles.list.length / pageSize)));
	const paged = $derived(roles.list.slice((page - 1) * pageSize, page * pageSize));

	function onDelete(role: RoleDto) {
		targetRole = role;
		deleteOpen = true;
	}
</script>

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Roles</h1>
			<p class="caption text-[var(--color-fg-muted)]">
				{roles.list.length} role{roles.list.length === 1 ? '' : 's'}
			</p>
		</div>
		<Button onclick={() => (createOpen = true)}>
			<Icon icon={Plus} size="sm" /> Create role
		</Button>
	</header>

	{#if roles.status === 'loading'}
		<div class="flex justify-center py-16"><Spinner size={32} /></div>
	{:else if roles.status === 'error' && roles.error}
		<Alert variant="danger" title="Couldn't load roles">{roles.error}</Alert>
	{:else if roles.list.length === 0}
		<EmptyState
			icon={Shield}
			title="No roles yet"
			description="Roles bundle permissions for easy assignment to team members."
		>
			{#snippet action()}
				<Button onclick={() => (createOpen = true)}>
					<Icon icon={Plus} size="sm" /> Create role
				</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<ul class="stack stack-tight" aria-label="Roles">
			{#each paged as role (role.id)}
				{@const badge = roleBadgeVariant(role)}
				{@const memberCount = roleMemberCount(role, users.list)}
				<li>
					<Card.Root>
						<Card.Content class="grid grid-cols-[1fr_auto_auto] items-center gap-4">
							<div class="stack stack-tight">
								<div class="cluster cluster-tight">
									<a
										href="/settings/roles/{role.id}"
										class="h5 text-[var(--color-fg)] hover:underline">{role.name}</a
									>
									<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
								</div>
								<p class="caption text-[var(--color-fg-muted)]">
									{memberCount} member{memberCount === 1 ? '' : 's'} · {role.permissions.length} permission{role
										.permissions.length === 1
										? ''
										: 's'} · level {role.hierarchy_level}
								</p>
							</div>
							<Dropdown.Root>
								<Dropdown.Trigger>
									<Button variant="ghost" size="sm" aria-label="Row actions">
										<Icon icon={MoreVertical} size="sm" />
									</Button>
								</Dropdown.Trigger>
								<Dropdown.Menu>
									<Dropdown.Item>
										<a href="/settings/roles/{role.id}" class="cluster cluster-tight">
											<Icon icon={Edit} size="sm" /> Edit
										</a>
									</Dropdown.Item>
									{#if !isProtectedRole(role)}
										<Dropdown.Separator />
										<Dropdown.Item variant="danger" onclick={() => onDelete(role)}>
											<Icon icon={Trash2} size="sm" /> Delete
										</Dropdown.Item>
									{/if}
								</Dropdown.Menu>
							</Dropdown.Root>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>
		<Pagination {page} {pageCount} onChange={(p) => (page = p)} />
	{/if}
</div>

<CreateRoleDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<DeleteRoleDialog bind:open={deleteOpen} role={targetRole} onOpenChange={(o) => (deleteOpen = o)} />
```

- [ ] **Step 2: Add Edit icon to registry if missing + commit**

```bash
git add src/lib/features/roles/components/RolesList.svelte src/lib/icons/index.ts
git commit -m "feat(roles): RolesList component

Paginated list of full-width Card rows; each row shows role
name, type Badge (System/SuperAdmin/Custom), member + permission
counts, row-action Dropdown (Edit→detail, Delete if not protected).
Empty state offers a Create CTA."
```

---

### Task 10: Role detail page

**Files:** `src/routes/(app)/settings/roles/[id]/+page.{ts,svelte}`

Detail page = role metadata editor + PermissionTree.

- [ ] **Step 1: Load + page**

```ts
// +page.ts
import { redirect, error } from '@sveltejs/kit';
import { session } from '$features/auth/stores/session.svelte';
import { hasPermission } from '$features/auth/tier';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	if (!hasPermission(session.principal, 'identity.roles.view')) {
		throw redirect(303, '/dashboard');
	}
	if (!params.id) throw error(404, 'Role not found');
	return { roleId: params.id };
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
	import { Alert, Badge, Button, Card, Spinner } from '$ui';
	import { TextField } from '$lib/components/form';
	import PermissionTree from '$features/roles/components/PermissionTree.svelte';
	import { roles } from '$features/roles/stores/roles.svelte';
	import { roleBadgeVariant, isProtectedRole } from '$features/roles/view-models';
	import { hasPermission } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';

	let { data } = $props();

	let name = $state('');
	let hierarchyLevel = $state(0);
	let selectedPerms = $state<string[]>([]);
	let error = $state<string | null>(null);
	let saved = $state(false);

	const role = $derived(roles.list.find((r) => r.id === data.roleId) ?? null);
	const protectedRole = $derived(role ? isProtectedRole(role) : false);
	const canUpdate = $derived(
		!protectedRole && hasPermission(session.principal, 'identity.roles.update')
	);

	$effect(() => {
		if (role) {
			name = role.name;
			hierarchyLevel = role.hierarchy_level;
			selectedPerms = [...role.permissions];
		}
	});

	$effect(() => {
		if (roles.status === 'idle') {
			roles.load().catch(() => {});
		}
	});

	const isMutating = $derived(roles.status === 'mutating');
	const metaDirty = $derived(
		role !== null && (name !== role.name || hierarchyLevel !== role.hierarchy_level)
	);
	const permsDirty = $derived(
		role !== null &&
			(selectedPerms.length !== role.permissions.length ||
				selectedPerms.some((p) => !role.permissions.includes(p)))
	);

	async function saveMeta() {
		if (!role || !canUpdate) return;
		error = null;
		saved = false;
		try {
			await roles.update(role.id, { name: name.trim(), hierarchy_level: hierarchyLevel });
			saved = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save';
		}
	}

	async function savePerms() {
		if (!role || !canUpdate) return;
		error = null;
		saved = false;
		try {
			await roles.setPermissions(role.id, selectedPerms);
			saved = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save permissions';
		}
	}
</script>

<svelte:head>
	<title>{role?.name ?? 'Role'} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<a
		href="/settings/roles"
		class="caption text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">← All roles</a
	>

	{#if roles.status === 'loading'}
		<div class="flex justify-center py-16"><Spinner size={32} /></div>
	{:else if !role}
		<Alert variant="warning" title="Role not found"
			>This role doesn't exist or you don't have access.</Alert
		>
	{:else}
		{@const badge = roleBadgeVariant(role)}
		<header class="cluster cluster-spread">
			<div class="stack stack-tight">
				<div class="cluster cluster-tight">
					<h1 class="h1">{role.name}</h1>
					<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
				</div>
				<p class="caption text-[var(--color-fg-muted)]">Hierarchy level {role.hierarchy_level}</p>
			</div>
		</header>

		{#if protectedRole}
			<Alert variant="info"
				>This role is protected by the system. Properties and permissions can't be edited.</Alert
			>
		{/if}
		{#if error}<Alert variant="danger">{error}</Alert>{/if}
		{#if saved}<Alert variant="success">Saved.</Alert>{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title>Properties</Card.Title>
			</Card.Header>
			<Card.Content class="stack stack-relaxed">
				<TextField
					label="Name"
					name="name"
					bind:value={name}
					minlength={3}
					maxlength={100}
					disabled={!canUpdate}
				/>
				<label class="stack stack-tight">
					<span class="label">Hierarchy level</span>
					<input
						type="number"
						bind:value={hierarchyLevel}
						min={0}
						max={100}
						disabled={!canUpdate}
						class="glass-input rounded-md px-3 py-2 text-sm"
					/>
				</label>
			</Card.Content>
			<Card.Footer>
				<Button
					disabled={!canUpdate || !metaDirty || isMutating}
					loading={isMutating}
					onclick={saveMeta}>Save properties</Button
				>
			</Card.Footer>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Permissions</Card.Title>
				<Card.Description>
					{selectedPerms.length} selected · changes apply atomically on save (PUT replaces the whole set).
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<PermissionTree
					bind:selected={selectedPerms}
					disabled={!canUpdate}
					onChange={(next) => (selectedPerms = next)}
				/>
			</Card.Content>
			<Card.Footer>
				<Button
					disabled={!canUpdate || !permsDirty || isMutating}
					loading={isMutating}
					onclick={savePerms}>Save permissions</Button
				>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>
```

If `Card.Title` / `Card.Description` props don't accept text directly (need a snippet/children), adapt. Read `src/lib/components/ui/card/CardTitle.svelte` etc. to confirm.

- [ ] **Step 2: Commit**

```bash
git add "src/routes/(app)/settings/roles/[id]"
git commit -m "feat(roles): role detail editor route

/settings/roles/[id] — name + hierarchy editor + PermissionTree.
Protected roles (SuperAdmin / system defaults) render disabled.
Permission edits use atomic-replace (PUT /v1/roles/{id}/permissions);
the page shows separate Save buttons for metadata vs permissions
so an admin can dirty-track each independently."
```

---

### Task 11: Roles list route

**Files:** `src/routes/(app)/settings/roles/+page.{ts,svelte}`

```ts
// +page.ts
import { redirect } from '@sveltejs/kit';
import { session } from '$features/auth/stores/session.svelte';
import { hasPermission } from '$features/auth/tier';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	if (!hasPermission(session.principal, 'identity.roles.view')) {
		throw redirect(303, '/dashboard');
	}
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
	import RolesList from '$features/roles/components/RolesList.svelte';
	import { roles } from '$features/roles/stores/roles.svelte';
	import { users } from '$features/users/stores/users.svelte';

	$effect(() => {
		if (roles.status === 'idle') roles.load().catch(() => {});
		if (users.status === 'idle') users.load().catch(() => {});
	});
</script>

<svelte:head><title>Roles · LeadKart</title></svelte:head>

<RolesList />
```

Note: users store is also loaded so RolesList can show member counts.

- [ ] Commit:

```bash
git add "src/routes/(app)/settings/roles/+page.svelte" "src/routes/(app)/settings/roles/+page.ts"
git commit -m "feat(roles): /settings/roles list route

Gated on identity.roles.view. Loads both roles and users stores
(users for the member-count column)."
```

---

### Task 12: E2e + CI gate

**Files:** `tests/e2e/tenant-roles-management.spec.ts` + final CI.

Pattern from slice 2: route-mock + signin helper. 2 tests — list renders + a11y. Commit + push + final CI.

- [ ] CI:

```
npm run lint && npm run check && npm run test:coverage && npm run build && npx size-limit && npx playwright test --list
```

All must pass. Push `git push origin feat/theme-customizer`. Report slice 3 summary.

---

## Acceptance criteria

- [ ] `/settings/roles` lists tenant roles gated on `identity.roles.view`
- [ ] Create role drawer + delete confirm with typed-name confirmation
- [ ] `/settings/roles/[id]` edits name, hierarchy, permissions (atomic replace)
- [ ] PermissionTree renders catalogue grouped by namespace, with indeterminate parent state and per-leaf Tooltip descriptions
- [ ] Protected roles (SuperAdmin / system) render disabled
- [ ] Tooltip primitive in place (compound, namespace-exported)
- [ ] Permission catalogue mirrors backend `permission.go`
- [ ] All visuals via tokens
- [ ] CI gate green
