# Slice 2 — Tenant user management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship tenant-admin user-management surface — list members, create/deactivate/reactivate users, assign/revoke roles, set manager, edit permission overrides — wired to real backend endpoints. Extracts the first batch of compound UI primitives (Drawer, Dialog, Dropdown, plus Pagination/Avatar/EmptyState singletons).

**Architecture:** New feature `lib/features/users/` mirroring the established `lib/features/tenant/` shape (api → schemas → types → view-models → store). New route `/settings/users` gated on `identity.users.view`. Primitives land in `lib/components/ui/` per the shadcn-svelte folder convention (compound → folder + namespace; singleton → flat).

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript 6, bits-ui@2.18 (headless behaviour for compound primitives), Zod, Tailwind 4, Vitest 4, Playwright + axe-core.

**Spec reference:** [`docs/superpowers/specs/2026-05-18-identity-module-completion-design.md`](../specs/2026-05-18-identity-module-completion-design.md) §3 (non-goals), §4 (cross-cutting), §5.2 (this slice).

**Prerequisites — read before starting:**

- `src/lib/features/tenant/` — pattern this slice mirrors
- `src/lib/features/auth/stores/profile.svelte.ts` — class-store pattern from slice 1
- `src/lib/components/ui/card/` — compound-namespace convention
- `src/lib/components/ui/Badge.svelte` — flat-singleton convention
- bits-ui Dialog docs (https://bits-ui.com/docs/components/dialog) — used by Drawer + Dialog primitives
- bits-ui DropdownMenu docs (https://bits-ui.com/docs/components/dropdown-menu) — used by Dropdown primitive

---

## Backend contract (reference — DO NOT change)

```
GET    /api/v1/users                                  → { users: UserDto[] }                    auth + identity.users.view
GET    /api/v1/users/{id}                             → UserDto                                  auth + identity.users.view
POST   /api/v1/users                                  → { person_id, membership_id, person_existed }
                                                                                                 auth + identity.users.create
                                                       body: { email, password, first_name, last_name }
PATCH  /api/v1/users/{id}/profile                     → 204                                      auth + identity.users.update
                                                       body: { designation, department, status_message }
POST   /api/v1/users/{id}/deactivate                  → 204                                      auth + identity.users.deactivate
                                                       body: { reason }
POST   /api/v1/users/{id}/reactivate                  → 204                                      auth + identity.users.reactivate
POST   /api/v1/users/{id}/unlock                      → 204                                      auth + identity.users.unlock
POST   /api/v1/users/{id}/roles                       → 204                                      auth + identity.roles.assign
                                                       body: { role_id }
DELETE /api/v1/users/{id}/roles/{roleId}              → 204                                      auth + identity.roles.revoke
PATCH  /api/v1/users/{id}/permission-overrides        → 204                                      auth + identity.users.update_permissions
                                                       body: { granted: string[], revoked: string[] }   (atomic replace)
PUT    /api/v1/users/{id}/manager                     → 204                                      auth + identity.users.update
                                                       body: { manager_id }
DELETE /api/v1/users/{id}/manager                     → 204                                      auth + identity.users.update
```

`UserDto` already defined in `lib/features/auth/{schemas,types}.ts` from slice 1. Reuse via barrel re-export.

For role catalogue (used by the role-assignment drawer): `GET /v1/roles` returns `{ roles: RoleDto[] }`. Slice 3 owns the roles feature; until slice 3 lands, slice 2 inlines a minimal `roles` gateway call + Zod schema for `RoleDto` (id, name, hierarchy_level, is_system_default, is_super_admin, permissions: string[]).

---

## File map

**Create:**

- `src/lib/features/users/api.ts`
- `src/lib/features/users/schemas.ts`
- `src/lib/features/users/types.ts`
- `src/lib/features/users/view-models.ts`
- `src/lib/features/users/stores/users.svelte.ts`
- `src/lib/features/users/components/UsersList.svelte`
- `src/lib/features/users/components/UserListRow.svelte`
- `src/lib/features/users/components/CreateUserDrawer.svelte`
- `src/lib/features/users/components/DeactivateUserDialog.svelte`
- `src/lib/features/users/components/RoleAssignmentDrawer.svelte`
- `src/lib/features/users/components/ManagerSelectorDrawer.svelte`
- `src/lib/features/users/components/PermissionOverridesPanel.svelte`
- `src/lib/components/ui/drawer/{Drawer,DrawerTrigger,DrawerContent,DrawerHeader,DrawerBody,DrawerFooter,DrawerClose}.svelte` + `index.ts`
- `src/lib/components/ui/dialog/{Dialog,DialogTrigger,DialogContent,DialogHeader,DialogBody,DialogFooter,DialogClose}.svelte` + `index.ts`
- `src/lib/components/ui/ConfirmDialog.svelte` (singleton composed on Dialog)
- `src/lib/components/ui/dropdown/{Dropdown,DropdownTrigger,DropdownMenu,DropdownItem,DropdownSeparator}.svelte` + `index.ts`
- `src/lib/components/ui/Pagination.svelte` (singleton)
- `src/lib/components/ui/Avatar.svelte` (singleton — initials on token gradient)
- `src/lib/components/ui/EmptyState.svelte` (singleton)
- `src/routes/(app)/settings/users/+page.svelte`
- `src/routes/(app)/settings/users/+page.ts` (load guard)
- `tests/unit/features/users/schemas.test.ts`
- `tests/unit/features/users/view-models.test.ts`
- `tests/e2e/tenant-user-management.spec.ts`

**Modify:**

- `src/lib/components/ui/index.ts` — add namespace + singleton exports
- `src/lib/icons/index.ts` — add `Plus`, `MoreVertical`, `ChevronLeft`, `ChevronRight`, `UserMinus`, `UserPlus`, `Lock`, `Unlock`, `Users` if missing

**No changes to** `src/lib/config/nav.ts` — `/settings/users` already exists in TENANT_ADMIN_NAV with `requires: 'identity.users.view'`.

---

## Task list

### Task 1: Bootstrap users feature schemas + types

**Files:**

- Create: `src/lib/features/users/schemas.ts`
- Create: `src/lib/features/users/types.ts`
- Test: `tests/unit/features/users/schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

```ts
import { describe, expect, it } from 'vitest';
import {
	listUsersResponseSchema,
	createUserRequestSchema,
	createUserResponseSchema,
	deactivateUserRequestSchema,
	assignUserRoleRequestSchema,
	replacePermissionOverridesRequestSchema,
	assignManagerRequestSchema,
	roleDtoSchema,
	listRolesResponseSchema
} from '$lib/features/users/schemas';

describe('listUsersResponseSchema', () => {
	it('parses a list shape', () => {
		expect(listUsersResponseSchema.parse({ users: [] }).users).toEqual([]);
	});
});

describe('createUserRequestSchema', () => {
	it('parses + .strict() rejects extras', () => {
		const ok = { email: 'a@b.com', password: 'CorrectHorse-1', first_name: 'A', last_name: 'B' };
		expect(createUserRequestSchema.parse(ok)).toEqual(ok);
		expect(() => createUserRequestSchema.parse({ ...ok, sneaky: 'no' })).toThrow();
	});
	it('rejects invalid email', () => {
		expect(() =>
			createUserRequestSchema.parse({ email: 'no', password: 'x', first_name: 'A', last_name: 'B' })
		).toThrow();
	});
});

describe('createUserResponseSchema', () => {
	it('parses', () => {
		expect(
			createUserResponseSchema.parse({ person_id: 'p', membership_id: 'm', person_existed: false })
		).toBeTruthy();
	});
});

describe('deactivateUserRequestSchema', () => {
	it('rejects empty reason', () => {
		expect(() => deactivateUserRequestSchema.parse({ reason: '' })).toThrow();
	});
	it('rejects extras (.strict)', () => {
		expect(() => deactivateUserRequestSchema.parse({ reason: 'x', extra: 1 })).toThrow();
	});
});

describe('replacePermissionOverridesRequestSchema', () => {
	it('parses empty arrays', () => {
		expect(
			replacePermissionOverridesRequestSchema.parse({ granted: [], revoked: [] })
		).toBeTruthy();
	});
});

describe('roleDtoSchema', () => {
	it('parses a role', () => {
		const raw = {
			id: 'r1',
			tenant_id: 't1',
			name: 'SalesExecutive',
			is_system_default: false,
			is_super_admin: false,
			hierarchy_level: 3,
			permissions: ['crm.leads.view'],
			created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-01-01T00:00:00Z'
		};
		expect(roleDtoSchema.parse(raw).name).toBe('SalesExecutive');
	});
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npx vitest run tests/unit/features/users/schemas.test.ts` → FAIL (module doesn't exist).

- [ ] **Step 3: Implement schemas**

Create `src/lib/features/users/schemas.ts`:

```ts
/**
 * Zod schemas for the tenant user-management feature. Parses every
 * backend response at the gateway boundary per CLAUDE.md.
 *
 * UserDto + listUsersResponseSchema reuse the shapes already declared
 * in `lib/features/auth/schemas.ts` (slice 1) — the backend uses the
 * same DTO for both /v1/users (list) and /v1/users/{id} (detail) and
 * for the caller's own profile.
 */
import { z } from 'zod';
import { userDtoSchema } from '$lib/features/auth/schemas';

export { userDtoSchema };

export const listUsersResponseSchema = z.object({
	users: z.array(userDtoSchema)
});

export const createUserRequestSchema = z
	.object({
		email: z.string().email(),
		password: z.string().min(1),
		first_name: z.string().min(1).max(120),
		last_name: z.string().min(1).max(120)
	})
	.strict();

export const createUserResponseSchema = z.object({
	person_id: z.string(),
	membership_id: z.string(),
	person_existed: z.boolean()
});

export const deactivateUserRequestSchema = z
	.object({
		reason: z.string().min(1).max(500)
	})
	.strict();

export const assignUserRoleRequestSchema = z.object({ role_id: z.string() }).strict();

export const replacePermissionOverridesRequestSchema = z
	.object({
		granted: z.array(z.string()),
		revoked: z.array(z.string())
	})
	.strict();

export const assignManagerRequestSchema = z.object({ manager_id: z.string() }).strict();

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
```

- [ ] **Step 4: Implement types**

Create `src/lib/features/users/types.ts`:

```ts
import type { z } from 'zod';
import type {
	listUsersResponseSchema,
	createUserRequestSchema,
	createUserResponseSchema,
	deactivateUserRequestSchema,
	assignUserRoleRequestSchema,
	replacePermissionOverridesRequestSchema,
	assignManagerRequestSchema,
	roleDtoSchema,
	listRolesResponseSchema
} from './schemas';

export type { UserDto } from '$lib/features/auth/types';

export type ListUsersResponse = z.output<typeof listUsersResponseSchema>;
export type CreateUserRequest = z.output<typeof createUserRequestSchema>;
export type CreateUserResponse = z.output<typeof createUserResponseSchema>;
export type DeactivateUserRequest = z.output<typeof deactivateUserRequestSchema>;
export type AssignUserRoleRequest = z.output<typeof assignUserRoleRequestSchema>;
export type ReplacePermissionOverridesRequest = z.output<
	typeof replacePermissionOverridesRequestSchema
>;
export type AssignManagerRequest = z.output<typeof assignManagerRequestSchema>;
export type RoleDto = z.output<typeof roleDtoSchema>;
export type ListRolesResponse = z.output<typeof listRolesResponseSchema>;
```

- [ ] **Step 5: Verify tests pass**

Run: `npx vitest run tests/unit/features/users/schemas.test.ts` → PASS.
Run: `npm run check` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/features/users tests/unit/features/users/schemas.test.ts
git commit -m "feat(users): bootstrap users feature schemas + types

Zod schemas for list / create / deactivate / role-assign /
permission-overrides / manager-assign request and response shapes.
RoleDto + listRolesResponse colocated here for slice 2 to use
the role catalogue in the assignment drawer — slice 3 will own
the roles feature module and move them there if needed."
```

---

### Task 2: Build users + roles gateway functions

**Files:**

- Create: `src/lib/features/users/api.ts`

- [ ] **Step 1: Implement**

```ts
/**
 * Gateway layer for tenant user management. Every response zod-parsed
 * at the boundary per CLAUDE.md. Tenant scope is the caller's JWT
 * tenant_id — no tenant_id parameter on any call.
 */
import { api } from '$api/client';
import {
	listUsersResponseSchema,
	createUserResponseSchema,
	userDtoSchema,
	listRolesResponseSchema
} from './schemas';
import type {
	ListUsersResponse,
	CreateUserRequest,
	CreateUserResponse,
	DeactivateUserRequest,
	AssignUserRoleRequest,
	ReplacePermissionOverridesRequest,
	AssignManagerRequest,
	UserDto,
	RoleDto
} from './types';

export async function listUsers(): Promise<ListUsersResponse> {
	const raw = await api.get<unknown>('/v1/users');
	return listUsersResponseSchema.parse(raw);
}

export async function getUser(membershipId: string): Promise<UserDto> {
	const raw = await api.get<unknown>(`/v1/users/${membershipId}`);
	return userDtoSchema.parse(raw);
}

export async function createUser(req: CreateUserRequest): Promise<CreateUserResponse> {
	const raw = await api.post<unknown>('/v1/users', req);
	return createUserResponseSchema.parse(raw);
}

export async function deactivateUser(
	membershipId: string,
	body: DeactivateUserRequest
): Promise<void> {
	await api.post<void>(`/v1/users/${membershipId}/deactivate`, body);
}

export async function reactivateUser(membershipId: string): Promise<void> {
	await api.post<void>(`/v1/users/${membershipId}/reactivate`);
}

export async function unlockUser(membershipId: string): Promise<void> {
	await api.post<void>(`/v1/users/${membershipId}/unlock`);
}

export async function assignRole(membershipId: string, body: AssignUserRoleRequest): Promise<void> {
	await api.post<void>(`/v1/users/${membershipId}/roles`, body);
}

export async function revokeRole(membershipId: string, roleId: string): Promise<void> {
	await api.delete<void>(`/v1/users/${membershipId}/roles/${roleId}`);
}

export async function replacePermissionOverrides(
	membershipId: string,
	body: ReplacePermissionOverridesRequest
): Promise<void> {
	await api.patch<void>(`/v1/users/${membershipId}/permission-overrides`, body);
}

export async function assignManager(
	membershipId: string,
	body: AssignManagerRequest
): Promise<void> {
	await api.put<void>(`/v1/users/${membershipId}/manager`, body);
}

export async function removeManager(membershipId: string): Promise<void> {
	await api.delete<void>(`/v1/users/${membershipId}/manager`);
}

/**
 * Role catalogue read — used by the role-assignment drawer. Slice 3
 * will own the roles feature; this minimal pass-through is the
 * temporary read.
 */
export async function listRoles(): Promise<RoleDto[]> {
	const raw = await api.get<unknown>('/v1/roles');
	return listRolesResponseSchema.parse(raw).roles;
}
```

- [ ] **Step 2: Verify `api.client` has put + delete with body**

Read `src/lib/api/client.ts`. Slice 1 added body support to `delete`. Confirm `put` accepts a body too. If not, extend the same way `post`/`patch`/`delete` work, in a separate commit BEFORE the gateway commit.

- [ ] **Step 3: Verify**

Run: `npm run check` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/features/users/api.ts
git commit -m "feat(users): gateway functions for tenant user management

12 typed wrappers — list, get, create, deactivate, reactivate,
unlock, assignRole, revokeRole, replacePermissionOverrides,
assignManager, removeManager, listRoles. Every response zod-parsed
at the boundary; mutations return void (204 contracts) and let
callers react via try/catch."
```

---

### Task 3: View-models for users feature

**Files:**

- Create: `src/lib/features/users/view-models.ts`
- Test: `tests/unit/features/users/view-models.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Confirm failure, implement, confirm pass**

Run: `npx vitest run tests/unit/features/users/view-models.test.ts` → FAIL.

Create `src/lib/features/users/view-models.ts`:

```ts
/**
 * Pure transforms — UserDto / RoleDto → render-ready shapes.
 * No async, no DOM, no side effects.
 */
import type { UserDto, RoleDto } from './types';
import { displayName } from '$features/auth/view-models';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function userStatusBadge(status: UserDto['status']): {
	label: string;
	variant: StatusVariant;
} {
	switch (status) {
		case 'active':
			return { label: 'Active', variant: 'success' };
		case 'pending':
			return { label: 'Pending', variant: 'warning' };
		case 'inactive':
			return { label: 'Inactive', variant: 'neutral' };
	}
}

export function userRoleBadges(
	user: UserDto,
	catalogue: ReadonlyArray<RoleDto>
): Array<{ id: string; name: string }> {
	return user.role_ids.map((id) => {
		const found = catalogue.find((r) => r.id === id);
		return { id, name: found?.name ?? id };
	});
}

export function managerLabel(user: UserDto, roster: ReadonlyArray<UserDto>): string | null {
	if (!user.reports_to) return null;
	const mgr = roster.find((u) => u.membership_id === user.reports_to);
	return mgr ? displayName(mgr) : user.reports_to;
}

export function canDeactivate(user: UserDto): boolean {
	return user.status === 'active';
}

export function canRevokeRole(role: RoleDto): boolean {
	return !role.is_super_admin;
}
```

Re-run test → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/features/users/view-models.ts tests/unit/features/users/view-models.test.ts
git commit -m "feat(users): view-models for status, role, manager display

Pure transforms — userStatusBadge, userRoleBadges, managerLabel,
canDeactivate, canRevokeRole. Covered by vitest."
```

---

### Task 4: UsersStore class

**Files:**

- Create: `src/lib/features/users/stores/users.svelte.ts`

- [ ] **Step 1: Implement**

```ts
/**
 * UsersStore — list + mutation state for the tenant's member roster.
 * Mirrors ProfileStore / TenantStore patterns. Mutations throw so
 * callers (drawers, dialogs) can react; load() catches silently.
 *
 * Local roster is the source of truth for the list view; mutations
 * update locally + optionally refetch on next list view mount.
 */
import {
	listUsers,
	createUser as createUserApi,
	deactivateUser as deactivateUserApi,
	reactivateUser as reactivateUserApi,
	unlockUser as unlockUserApi,
	assignRole as assignRoleApi,
	revokeRole as revokeRoleApi,
	replacePermissionOverrides as replacePermissionOverridesApi,
	assignManager as assignManagerApi,
	removeManager as removeManagerApi,
	listRoles as listRolesApi,
	getUser
} from '$features/users/api';
import type {
	UserDto,
	RoleDto,
	CreateUserRequest,
	CreateUserResponse,
	ReplacePermissionOverridesRequest
} from '$features/users/types';

export type UsersStatus = 'idle' | 'loading' | 'ready' | 'mutating' | 'error';

export class UsersStore {
	list = $state<UserDto[]>([]);
	roles = $state<RoleDto[]>([]);
	status = $state<UsersStatus>('idle');
	error = $state<string | null>(null);

	async load(): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			const [{ users }, roles] = await Promise.all([listUsers(), listRolesApi()]);
			this.list = users;
			this.roles = roles;
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load users';
		}
	}

	async refresh(): Promise<void> {
		try {
			const { users } = await listUsers();
			this.list = users;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to refresh users';
		}
	}

	async create(req: CreateUserRequest): Promise<CreateUserResponse> {
		this.status = 'mutating';
		try {
			const resp = await createUserApi(req);
			// Reload list to pick up the new member.
			const { users } = await listUsers();
			this.list = users;
			this.status = 'ready';
			return resp;
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to create user';
			throw e;
		}
	}

	async deactivate(membershipId: string, reason: string): Promise<void> {
		await this.mutate(() => deactivateUserApi(membershipId, { reason }), membershipId);
	}

	async reactivate(membershipId: string): Promise<void> {
		await this.mutate(() => reactivateUserApi(membershipId), membershipId);
	}

	async unlock(membershipId: string): Promise<void> {
		await this.mutate(() => unlockUserApi(membershipId), membershipId);
	}

	async assignRole(membershipId: string, roleId: string): Promise<void> {
		await this.mutate(() => assignRoleApi(membershipId, { role_id: roleId }), membershipId);
	}

	async revokeRole(membershipId: string, roleId: string): Promise<void> {
		await this.mutate(() => revokeRoleApi(membershipId, roleId), membershipId);
	}

	async replacePermissionOverrides(
		membershipId: string,
		body: ReplacePermissionOverridesRequest
	): Promise<void> {
		await this.mutate(() => replacePermissionOverridesApi(membershipId, body), membershipId);
	}

	async assignManager(membershipId: string, managerId: string): Promise<void> {
		await this.mutate(
			() => assignManagerApi(membershipId, { manager_id: managerId }),
			membershipId
		);
	}

	async removeManager(membershipId: string): Promise<void> {
		await this.mutate(() => removeManagerApi(membershipId), membershipId);
	}

	reset(): void {
		this.list = [];
		this.roles = [];
		this.status = 'idle';
		this.error = null;
	}

	/**
	 * Runs a mutating gateway call + refreshes only the affected
	 * member's record (single GET, not a full list re-fetch).
	 */
	private async mutate(operation: () => Promise<void>, membershipId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await operation();
			const fresh = await getUser(membershipId);
			const idx = this.list.findIndex((u) => u.membership_id === membershipId);
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

export const users = new UsersStore();
```

- [ ] **Step 2: Verify**

Run: `npm run check` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/features/users/stores/users.svelte.ts
git commit -m "feat(users): UsersStore class for roster + mutations

Mirrors ProfileStore + TenantStore patterns. load() pulls users
+ roles in parallel; mutate() calls the gateway then refreshes
only the affected row via GET /v1/users/{id} (no full list refetch).
Mutations throw, load() catches silently."
```

---

### Task 5: Extract Drawer primitive (bits-ui + Domiex composition)

**Files:**

- Create: `src/lib/components/ui/drawer/{Drawer.svelte, DrawerTrigger.svelte, DrawerContent.svelte, DrawerHeader.svelte, DrawerBody.svelte, DrawerFooter.svelte, DrawerClose.svelte, index.ts}`
- Modify: `src/lib/components/ui/index.ts` — add `export * as Drawer from './drawer';`

Drawer is a right-side slide-over built on bits-ui Dialog. Composition follows Domiex's `DrawerHeader/Body/Footer` shape with our `.glass-card` material.

- [ ] **Step 1: Inspect bits-ui Dialog API**

Read `node_modules/bits-ui/dist/bits/dialog/index.d.ts` (or wherever the type defs live) to see the export shape. The Dialog has: Root, Trigger, Portal, Overlay, Content, Title, Description, Close. Drawer wraps these.

- [ ] **Step 2: Implement Drawer.svelte (Root)**

```svelte
<!-- src/lib/components/ui/drawer/Drawer.svelte -->
<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children: Snippet;
	};

	let { open = $bindable(false), onOpenChange, children }: Props = $props();
</script>

<BitsDialog.Root bind:open {onOpenChange}>
	{@render children()}
</BitsDialog.Root>
```

- [ ] **Step 3: Implement DrawerTrigger.svelte**

```svelte
<!-- src/lib/components/ui/drawer/DrawerTrigger.svelte -->
<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className = '', children, ...rest }: Props = $props();
</script>

<BitsDialog.Trigger class={className} {...rest}>
	{@render children()}
</BitsDialog.Trigger>
```

- [ ] **Step 4: Implement DrawerContent.svelte**

```svelte
<!-- src/lib/components/ui/drawer/DrawerContent.svelte -->
<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className = '', children }: Props = $props();
</script>

<BitsDialog.Portal>
	<BitsDialog.Overlay
		class="z-overlay fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm"
		style="z-index: var(--z-overlay);"
	/>
	<BitsDialog.Content
		class={cn(
			'glass-card z-modal fixed inset-y-0 right-0 flex w-full max-w-md flex-col',
			'rounded-none border-0 border-l border-[var(--glass-border-subtle)]',
			'animate-slide-in-right',
			className
		)}
		style="z-index: var(--z-modal); position: fixed;"
	>
		{@render children()}
	</BitsDialog.Content>
</BitsDialog.Portal>
```

Note: the `position: fixed` inline style is required because `.glass-card` declares `position: relative` to anchor its `::before` inner-gradient pseudo (same pattern as SettingsModal in `lib/layouts/`).

- [ ] **Step 5: Implement Header / Body / Footer / Close**

```svelte
<!-- DrawerHeader.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let { class: className = '', children }: { class?: string; children: Snippet } = $props();
</script>

<header
	class={cn(
		'flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4',
		className
	)}
>
	{@render children()}
</header>
```

```svelte
<!-- DrawerBody.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let { class: className = '', children }: { class?: string; children: Snippet } = $props();
</script>

<div class={cn('flex-1 overflow-y-auto px-5 py-5', className)}>
	{@render children()}
</div>
```

```svelte
<!-- DrawerFooter.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	let { class: className = '', children }: { class?: string; children: Snippet } = $props();
</script>

<footer
	class={cn(
		'flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4',
		className
	)}
>
	{@render children()}
</footer>
```

```svelte
<!-- DrawerClose.svelte -->
<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = { class?: string; children: Snippet };
	let { class: className = '', children }: Props = $props();
</script>

<BitsDialog.Close class={className}>
	{@render children()}
</BitsDialog.Close>
```

- [ ] **Step 6: Create index.ts barrel**

```ts
// src/lib/components/ui/drawer/index.ts
export { default as Root } from './Drawer.svelte';
export { default as Trigger } from './DrawerTrigger.svelte';
export { default as Content } from './DrawerContent.svelte';
export { default as Header } from './DrawerHeader.svelte';
export { default as Body } from './DrawerBody.svelte';
export { default as Footer } from './DrawerFooter.svelte';
export { default as Close } from './DrawerClose.svelte';
```

- [ ] **Step 7: Re-export from ui barrel**

In `src/lib/components/ui/index.ts`, add (alphabetically with other namespace exports):

```ts
export * as Drawer from './drawer';
```

- [ ] **Step 8: Verify**

Run: `npm run check && npm run build` → both PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/components/ui/drawer src/lib/components/ui/index.ts
git commit -m "feat(ui): Drawer primitive (compound, bits-ui-backed)

Right-side slide-over composed of Root/Trigger/Content/Header/
Body/Footer/Close parts. Behavior comes from bits-ui Dialog
(focus trap, ESC, ARIA roles, portal). Visual via .glass-card
material + token-driven layout. Folder convention per spec §4.4
(shadcn-svelte: compound = folder + namespace barrel)."
```

---

### Task 6: Extract Dialog + ConfirmDialog primitives

**Files:**

- Create: `src/lib/components/ui/dialog/{Dialog,DialogTrigger,DialogContent,DialogHeader,DialogBody,DialogFooter,DialogClose}.svelte` + `index.ts`
- Create: `src/lib/components/ui/ConfirmDialog.svelte`
- Modify: `src/lib/components/ui/index.ts`

Dialog is the centered variant of Drawer — same bits-ui backing, different positioning. ConfirmDialog is a composed convenience component.

- [ ] **Step 1: Implement Dialog parts**

Same shape as Drawer parts but `DialogContent` uses center positioning instead of edge-anchoring:

```svelte
<!-- DialogContent.svelte -->
<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className = '', children }: Props = $props();
</script>

<BitsDialog.Portal>
	<BitsDialog.Overlay
		class="animate-fade-in fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm"
		style="z-index: var(--z-overlay);"
	/>
	<BitsDialog.Content
		class={cn(
			'glass-card z-modal fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
			'animate-pop-in flex flex-col',
			className
		)}
		style="z-index: var(--z-modal); position: fixed;"
	>
		{@render children()}
	</BitsDialog.Content>
</BitsDialog.Portal>
```

Header / Body / Footer / Close / Trigger / Root files mirror Drawer's shape — same imports, same composition, same patterns.

- [ ] **Step 2: index.ts barrel**

```ts
export { default as Root } from './Dialog.svelte';
export { default as Trigger } from './DialogTrigger.svelte';
export { default as Content } from './DialogContent.svelte';
export { default as Header } from './DialogHeader.svelte';
export { default as Body } from './DialogBody.svelte';
export { default as Footer } from './DialogFooter.svelte';
export { default as Close } from './DialogClose.svelte';
```

- [ ] **Step 3: ConfirmDialog.svelte (singleton composed on Dialog)**

```svelte
<!-- src/lib/components/ui/ConfirmDialog.svelte -->
<script lang="ts">
	import { Dialog } from '$ui';
	import Button from './Button.svelte';
	import type { Snippet } from 'svelte';

	type Variant = 'default' | 'danger';

	type Props = {
		open: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: Variant;
		loading?: boolean;
		onConfirm: () => void | Promise<void>;
		onOpenChange?: (open: boolean) => void;
		body?: Snippet;
	};

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'default',
		loading = false,
		onConfirm,
		onOpenChange,
		body
	}: Props = $props();

	async function onConfirmClick() {
		await onConfirm();
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content>
		<Dialog.Header>
			<div class="stack stack-tight">
				<h2 class="h5">{title}</h2>
				{#if description}<p class="body-sm text-[var(--color-fg-muted)]">{description}</p>{/if}
			</div>
		</Dialog.Header>
		{#if body}
			<Dialog.Body>{@render body()}</Dialog.Body>
		{/if}
		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="ghost" disabled={loading}>{cancelLabel}</Button>
			</Dialog.Close>
			<Button
				variant={variant === 'danger' ? 'danger' : 'primary'}
				{loading}
				onclick={onConfirmClick}
			>
				{confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
```

If `Button` doesn't have a `danger` variant, check `src/lib/components/ui/Button.svelte` and adapt — use whatever the existing variants are (likely `primary | secondary | ghost | danger` or similar).

- [ ] **Step 4: Re-export**

In `src/lib/components/ui/index.ts`:

```ts
export * as Dialog from './dialog';
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
```

- [ ] **Step 5: Verify + Commit**

```bash
git add src/lib/components/ui/dialog src/lib/components/ui/ConfirmDialog.svelte src/lib/components/ui/index.ts
git commit -m "feat(ui): Dialog + ConfirmDialog primitives

Dialog is the centered variant of Drawer — same bits-ui backing,
different positioning + pop-in animation. ConfirmDialog wraps
Dialog with a standard title/description/confirm-cancel shape
(singleton composed on the compound) for the typical confirm-an-
action flow used across deactivate/revoke/restore mutations."
```

---

### Task 7: Extract Dropdown primitive

**Files:**

- Create: `src/lib/components/ui/dropdown/{Dropdown,DropdownTrigger,DropdownMenu,DropdownItem,DropdownSeparator}.svelte` + `index.ts`
- Modify: `src/lib/components/ui/index.ts`

Built on bits-ui DropdownMenu (`bits-ui@2.18`).

- [ ] **Step 1: Implement parts**

```svelte
<!-- Dropdown.svelte (Root) -->
<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = { children: Snippet };
	let { children }: Props = $props();
</script>

<BitsMenu.Root>{@render children()}</BitsMenu.Root>
```

```svelte
<!-- DropdownTrigger.svelte -->
<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	let {
		class: className = '',
		children,
		...rest
	}: { class?: string; children: Snippet } = $props();
</script>

<BitsMenu.Trigger class={className} {...rest}>{@render children()}</BitsMenu.Trigger>
```

```svelte
<!-- DropdownMenu.svelte -->
<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		align?: 'start' | 'center' | 'end';
		side?: 'top' | 'right' | 'bottom' | 'left';
		children: Snippet;
	};

	let { class: className = '', align = 'end', side = 'bottom', children }: Props = $props();
</script>

<BitsMenu.Portal>
	<BitsMenu.Content
		{align}
		{side}
		sideOffset={4}
		class={cn('glass-card z-dropdown min-w-[10rem] p-1', 'animate-fade-in', className)}
		style="z-index: var(--z-dropdown); position: fixed;"
	>
		{@render children()}
	</BitsMenu.Content>
</BitsMenu.Portal>
```

```svelte
<!-- DropdownItem.svelte -->
<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		disabled?: boolean;
		variant?: 'default' | 'danger';
		onclick?: () => void;
		children: Snippet;
	};

	let {
		class: className = '',
		disabled = false,
		variant = 'default',
		onclick,
		children
	}: Props = $props();
</script>

<BitsMenu.Item
	{disabled}
	onSelect={onclick}
	class={cn(
		'label inline-flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5',
		'data-[highlighted]:bg-[var(--color-bg-muted)]',
		'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
		variant === 'danger'
			? 'text-[var(--color-danger-700)] data-[highlighted]:bg-[var(--color-danger-50)]'
			: 'text-[var(--color-fg)]',
		className
	)}
>
	{@render children()}
</BitsMenu.Item>
```

```svelte
<!-- DropdownSeparator.svelte -->
<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
</script>

<BitsMenu.Separator class="my-1 h-px bg-[var(--color-border)]" />
```

- [ ] **Step 2: index.ts barrel + ui-barrel export**

```ts
// dropdown/index.ts
export { default as Root } from './Dropdown.svelte';
export { default as Trigger } from './DropdownTrigger.svelte';
export { default as Menu } from './DropdownMenu.svelte';
export { default as Item } from './DropdownItem.svelte';
export { default as Separator } from './DropdownSeparator.svelte';
```

`ui/index.ts`: `export * as Dropdown from './dropdown';`

- [ ] **Step 3: Verify + commit**

```bash
git add src/lib/components/ui/dropdown src/lib/components/ui/index.ts
git commit -m "feat(ui): Dropdown primitive (compound, bits-ui-backed)

Row-action menus + general dropdowns. Composed of Root/Trigger/
Menu/Item/Separator parts. Behavior from bits-ui DropdownMenu
(focus, keyboard, ARIA, click-outside). Visual via .glass-card."
```

---

### Task 8: Pagination + Avatar + EmptyState singletons

**Files:**

- Create: `src/lib/components/ui/Pagination.svelte`
- Create: `src/lib/components/ui/Avatar.svelte`
- Create: `src/lib/components/ui/EmptyState.svelte`
- Modify: `src/lib/components/ui/index.ts`

- [ ] **Step 1: Pagination**

```svelte
<script lang="ts" module>
	export type PaginationChange = (page: number) => void;
</script>

<script lang="ts">
	import { ChevronLeft, ChevronRight, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';

	type Props = {
		page: number;
		pageCount: number;
		onChange: PaginationChange;
		class?: string;
	};

	let { page, pageCount, onChange, class: className = '' }: Props = $props();

	const canPrev = $derived(page > 1);
	const canNext = $derived(page < pageCount);

	function visiblePages(current: number, total: number): Array<number | 'gap'> {
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
		const pages: Array<number | 'gap'> = [1];
		if (current > 3) pages.push('gap');
		const start = Math.max(2, current - 1);
		const end = Math.min(total - 1, current + 1);
		for (let i = start; i <= end; i++) pages.push(i);
		if (current < total - 2) pages.push('gap');
		pages.push(total);
		return pages;
	}

	const pages = $derived(visiblePages(page, pageCount));
</script>

<nav class={cn('cluster cluster-tight', className)} aria-label="Pagination">
	<button
		type="button"
		class="label inline-flex items-center gap-1 rounded-md px-2 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:cursor-not-allowed disabled:opacity-40"
		disabled={!canPrev}
		aria-label="Previous page"
		onclick={() => onChange(page - 1)}
	>
		<Icon icon={ChevronLeft} size="sm" />
		Prev
	</button>
	<ul class="cluster cluster-tight list-none">
		{#each pages as p, i (i)}
			<li>
				{#if p === 'gap'}
					<span class="px-2 text-[var(--color-fg-subtle)]">…</span>
				{:else}
					<button
						type="button"
						class={cn(
							'label inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2',
							p === page
								? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
								: 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-fg)]'
						)}
						aria-current={p === page ? 'page' : undefined}
						onclick={() => onChange(p)}
					>
						{p}
					</button>
				{/if}
			</li>
		{/each}
	</ul>
	<button
		type="button"
		class="label inline-flex items-center gap-1 rounded-md px-2 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:cursor-not-allowed disabled:opacity-40"
		disabled={!canNext}
		aria-label="Next page"
		onclick={() => onChange(page + 1)}
	>
		Next
		<Icon icon={ChevronRight} size="sm" />
	</button>
</nav>
```

- [ ] **Step 2: Avatar**

```svelte
<script lang="ts" module>
	export type AvatarSize = 'sm' | 'md' | 'lg';
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';

	type Props = {
		initials: string;
		size?: AvatarSize;
		class?: string;
	};

	let { initials, size = 'md', class: className = '' }: Props = $props();

	const sizes: Record<AvatarSize, string> = {
		sm: 'inline-size-7 block-size-7 text-[var(--text-2xs)]',
		md: 'inline-size-10 block-size-10 text-sm',
		lg: 'inline-size-14 block-size-14 text-base'
	};
</script>

<span
	class={cn(
		'inline-flex items-center justify-center rounded-full font-medium uppercase',
		'bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-bg-muted))]',
		'text-[var(--color-primary)]',
		sizes[size],
		className
	)}
	aria-hidden="true"
>
	{initials}
</span>
```

- [ ] **Step 3: EmptyState**

```svelte
<script lang="ts">
	import type { Snippet, Component } from 'svelte';
	import { Icon } from '$icons';
	import { cn } from '$lib/utils/cn';

	type Props = {
		icon?: Component;
		title: string;
		description?: string;
		class?: string;
		action?: Snippet;
	};

	let { icon, title, description, class: className = '', action }: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center gap-3 py-12 text-center text-[var(--color-fg-muted)]',
		className
	)}
>
	{#if icon}
		<div
			class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-fg-subtle)]"
		>
			<Icon {icon} size="lg" />
		</div>
	{/if}
	<div class="stack stack-tight">
		<h3 class="h6 text-[var(--color-fg)]">{title}</h3>
		{#if description}<p class="body-sm">{description}</p>{/if}
	</div>
	{#if action}{@render action()}{/if}
</div>
```

- [ ] **Step 4: Re-export and verify**

In `src/lib/components/ui/index.ts`:

```ts
export { default as Avatar } from './Avatar.svelte';
export { default as EmptyState } from './EmptyState.svelte';
export { default as Pagination } from './Pagination.svelte';
```

Run: `npm run check && npm run build` → PASS.

- [ ] **Step 5: Verify icons available**

Check that `Plus`, `MoreVertical`, `ChevronLeft`, `ChevronRight`, `UserPlus`, `UserMinus`, `Lock`, `Unlock`, `Users` are exported from `$icons`. Add any missing ones to `src/lib/icons/index.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ui/{Pagination,Avatar,EmptyState}.svelte src/lib/components/ui/index.ts src/lib/icons/index.ts
git commit -m "feat(ui): Pagination + Avatar + EmptyState singletons

Three flat singletons per the shadcn-svelte folder convention.
Pagination handles >7-page collapse with a 'gap' sentinel.
Avatar is a token-gradient circle of initials (no upload — no
backend endpoint). EmptyState is the standard zero-data Card."
```

---

### Task 9: CreateUserDrawer + DeactivateUserDialog

**Files:**

- Create: `src/lib/features/users/components/CreateUserDrawer.svelte`
- Create: `src/lib/features/users/components/DeactivateUserDialog.svelte`

- [ ] **Step 1: CreateUserDrawer**

```svelte
<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField, PasswordField } from '$lib/components/form';
	import { users } from '$features/users/stores/users.svelte';
	import type { CreateUserRequest } from '$features/users/types';

	type Props = {
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), onOpenChange }: Props = $props();

	let email = $state('');
	let password = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let error = $state<string | null>(null);
	let success = $state<{ membershipId: string; personExisted: boolean } | null>(null);

	function resetForm() {
		email = '';
		password = '';
		firstName = '';
		lastName = '';
		error = null;
		success = null;
	}

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		success = null;
		const req: CreateUserRequest = {
			email: email.trim(),
			password,
			first_name: firstName.trim(),
			last_name: lastName.trim()
		};
		try {
			const resp = await users.create(req);
			success = { membershipId: resp.membership_id, personExisted: resp.person_existed };
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create user';
		}
	}

	function handleClose(next: boolean) {
		if (!next && success) resetForm();
		onOpenChange(next);
	}

	const isSubmitting = $derived(users.status === 'mutating');
</script>

<Drawer.Root bind:open onOpenChange={handleClose}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Add team member</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Sends a sign-in to the email below. Roles can be assigned after creation.
				</p>
			</div>
			<Drawer.Close>
				<button
					type="button"
					class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]"
					aria-label="Close"
				>
					×
				</button>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			{#if success}
				<Alert variant="success">
					Member added. {success.personExisted
						? 'This email already had a LeadKart identity; we attached a new tenant membership to it.'
						: 'A new identity was created.'}
				</Alert>
				<div class="cluster mt-4">
					<Button variant="ghost" onclick={resetForm}>Add another</Button>
					<Button onclick={() => handleClose(false)}>Done</Button>
				</div>
			{:else}
				<form id="create-user-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
					<TextField label="Email" name="email" type="email" bind:value={email} required />
					<TextField
						label="First name"
						name="first_name"
						bind:value={firstName}
						required
						maxlength={120}
					/>
					<TextField
						label="Last name"
						name="last_name"
						bind:value={lastName}
						required
						maxlength={120}
					/>
					<PasswordField label="Initial password" name="password" bind:value={password} required />
					<p class="caption text-[var(--color-fg-subtle)]">
						The user will be prompted to change this on first sign-in.
					</p>
					{#if error}<Alert variant="danger">{error}</Alert>{/if}
				</form>
			{/if}
		</Drawer.Body>
		{#if !success}
			<Drawer.Footer>
				<Drawer.Close>
					<Button variant="ghost" disabled={isSubmitting}>Cancel</Button>
				</Drawer.Close>
				<Button type="submit" form="create-user-form" loading={isSubmitting}>Create user</Button>
			</Drawer.Footer>
		{/if}
	</Drawer.Content>
</Drawer.Root>
```

- [ ] **Step 2: DeactivateUserDialog**

```svelte
<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth/view-models';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	let reason = $state('');
	let error = $state<string | null>(null);
	const isPending = $derived(users.status === 'mutating');

	async function onConfirm() {
		if (!user) return;
		error = null;
		try {
			await users.deactivate(user.membership_id, reason.trim());
			reason = '';
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to deactivate';
		}
	}
</script>

<ConfirmDialog
	bind:open
	title="Deactivate {user ? displayName(user) : 'user'}"
	description="Deactivated users can't sign in until reactivated. All open sessions are revoked. This is reversible."
	confirmLabel="Deactivate"
	variant="danger"
	loading={isPending}
	{onOpenChange}
	{onConfirm}
>
	{#snippet body()}
		<label class="stack stack-tight">
			<span class="label">Reason (required, audited)</span>
			<textarea
				bind:value={reason}
				required
				minlength={1}
				maxlength={500}
				rows={3}
				class="glass-input w-full rounded-md px-3 py-2 text-sm"
			></textarea>
		</label>
		{#if error}<Alert variant="danger">{error}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
```

- [ ] **Step 3: Verify + commit**

```bash
git add src/lib/features/users/components/CreateUserDrawer.svelte src/lib/features/users/components/DeactivateUserDialog.svelte
git commit -m "feat(users): CreateUserDrawer + DeactivateUserDialog

Create drawer collects email/password/first/last; on 201 shows
the person_existed callout (Auth0 / Microsoft Entra canon for
'attached to existing identity'). Deactivate dialog forces a
reason capture (required, audited, max 500 chars) per the
backend contract."
```

---

### Task 10: RoleAssignmentDrawer + ManagerSelectorDrawer + PermissionOverridesPanel

**Files:**

- Create: `src/lib/features/users/components/RoleAssignmentDrawer.svelte`
- Create: `src/lib/features/users/components/ManagerSelectorDrawer.svelte`
- Create: `src/lib/features/users/components/PermissionOverridesPanel.svelte`

These three carry the more complex flows. Each follows the same shape: open drawer → modify state → submit → store mutate → close on success.

- [ ] **Step 1: RoleAssignmentDrawer**

```svelte
<script lang="ts">
	import { Drawer, Button, Badge, Alert } from '$ui';
	import { Icon, Plus, X } from '$icons';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';
	import { canRevokeRole } from '$features/users/view-models';
	import { displayName } from '$features/auth/view-models';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	let error = $state<string | null>(null);

	async function onAssign(roleId: string) {
		if (!user) return;
		error = null;
		try {
			await users.assignRole(user.membership_id, roleId);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to assign role';
		}
	}

	async function onRevoke(roleId: string) {
		if (!user) return;
		error = null;
		try {
			await users.revokeRole(user.membership_id, roleId);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to revoke role';
		}
	}

	const assignedRoles = $derived(
		user ? users.roles.filter((r) => user.role_ids.includes(r.id)) : []
	);
	const availableRoles = $derived(
		user ? users.roles.filter((r) => !user.role_ids.includes(r.id)) : []
	);
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Roles for {user ? displayName(user) : 'user'}</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Assignments are immediate. Each role contributes its default permissions; user-level
					grants/revokes overlay on top.
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
			<section class="stack stack-tight mb-6">
				<h3 class="overline">Assigned</h3>
				{#if assignedRoles.length === 0}
					<p class="body-sm text-[var(--color-fg-muted)]">No roles assigned.</p>
				{:else}
					<ul class="stack stack-tight" aria-label="Assigned roles">
						{#each assignedRoles as role (role.id)}
							<li
								class="cluster cluster-spread rounded-md border border-[var(--color-border)] px-3 py-2"
							>
								<div class="stack stack-tight">
									<span class="label">{role.name}</span>
									{#if role.is_system_default}<Badge variant="info" style="soft" size="sm"
											>System</Badge
										>{/if}
								</div>
								{#if canRevokeRole(role)}
									<Button variant="ghost" size="sm" onclick={() => onRevoke(role.id)}>
										<Icon icon={X} size="sm" /> Revoke
									</Button>
								{:else}
									<Badge variant="warning" style="soft" size="sm">Protected</Badge>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			<section class="stack stack-tight">
				<h3 class="overline">Available</h3>
				{#if availableRoles.length === 0}
					<p class="body-sm text-[var(--color-fg-muted)]">All catalogue roles already assigned.</p>
				{:else}
					<ul class="stack stack-tight" aria-label="Available roles">
						{#each availableRoles as role (role.id)}
							<li
								class="cluster cluster-spread rounded-md border border-[var(--color-border)] px-3 py-2"
							>
								<span class="label">{role.name}</span>
								<Button variant="ghost" size="sm" onclick={() => onAssign(role.id)}>
									<Icon icon={Plus} size="sm" /> Assign
								</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			{#if error}<Alert class="mt-4" variant="danger">{error}</Alert>{/if}
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost">Done</Button>
			</Drawer.Close>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
```

- [ ] **Step 2: ManagerSelectorDrawer**

```svelte
<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { Select } from '$lib/components/form';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth/view-models';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	let selectedManager = $state<string>('');
	let error = $state<string | null>(null);

	$effect(() => {
		if (user) selectedManager = user.reports_to ?? '';
	});

	const eligibleManagers = $derived(
		user
			? users.list.filter((u) => u.membership_id !== user.membership_id && u.status === 'active')
			: []
	);

	async function onSave() {
		if (!user) return;
		error = null;
		try {
			if (selectedManager) {
				await users.assignManager(user.membership_id, selectedManager);
			} else if (user.reports_to) {
				await users.removeManager(user.membership_id);
			}
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update manager';
		}
	}

	const isPending = $derived(users.status === 'mutating');
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Manager for {user ? displayName(user) : 'user'}</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Used by hierarchy-scoped lists (lead reports, leave approvals) and the org tree.
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
			<Select
				label="Reports to"
				name="manager"
				bind:value={selectedManager}
				options={[
					{ value: '', label: '— No manager —' },
					...eligibleManagers.map((m) => ({ value: m.membership_id, label: displayName(m) }))
				]}
			/>
			{#if error}<Alert class="mt-4" variant="danger">{error}</Alert>{/if}
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Drawer.Close>
			<Button loading={isPending} onclick={onSave}>Save</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
```

- [ ] **Step 3: PermissionOverridesPanel**

```svelte
<script lang="ts">
	import { Drawer, Button, Badge, Alert } from '$ui';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth/view-models';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	let granted = $state<string[]>([]);
	let revoked = $state<string[]>([]);
	let error = $state<string | null>(null);

	$effect(() => {
		// V1: no backend endpoint returns the existing overrides per
		// user; we manage them blind. Future GET /users/{id} should
		// include grant/revoke arrays — until then this UI is grant-only-on-save.
		granted = [];
		revoked = [];
	});

	let newGrant = $state('');
	let newRevoke = $state('');

	function addGrant() {
		const name = newGrant.trim();
		if (name && !granted.includes(name)) granted = [...granted, name];
		newGrant = '';
	}

	function addRevoke() {
		const name = newRevoke.trim();
		if (name && !revoked.includes(name)) revoked = [...revoked, name];
		newRevoke = '';
	}

	function removeGrant(name: string) {
		granted = granted.filter((n) => n !== name);
	}

	function removeRevoke(name: string) {
		revoked = revoked.filter((n) => n !== name);
	}

	async function onSave() {
		if (!user) return;
		error = null;
		try {
			await users.replacePermissionOverrides(user.membership_id, { granted, revoked });
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save overrides';
		}
	}

	const isPending = $derived(users.status === 'mutating');
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Permission overrides for {user ? displayName(user) : 'user'}</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Atomic replace: this exact set of grants and revokes overlays on top of role-default
					permissions. Empty arrays clear the overlay.
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
			<section class="stack stack-tight mb-6">
				<h3 class="overline">Extra grants</h3>
				<div class="cluster">
					<input
						class="glass-input flex-1 rounded-md px-3 py-2 text-sm"
						placeholder="e.g. crm.leads.reassign"
						bind:value={newGrant}
					/>
					<Button variant="ghost" onclick={addGrant}>Add</Button>
				</div>
				{#if granted.length > 0}
					<ul class="cluster" aria-label="Granted permissions">
						{#each granted as p (p)}
							<li>
								<Badge variant="success" style="soft" size="sm"
									>{p}
									<button class="ml-1" onclick={() => removeGrant(p)} aria-label="Remove">×</button>
								</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			<section class="stack stack-tight">
				<h3 class="overline">Revocations</h3>
				<div class="cluster">
					<input
						class="glass-input flex-1 rounded-md px-3 py-2 text-sm"
						placeholder="e.g. crm.leads.delete"
						bind:value={newRevoke}
					/>
					<Button variant="ghost" onclick={addRevoke}>Add</Button>
				</div>
				{#if revoked.length > 0}
					<ul class="cluster" aria-label="Revoked permissions">
						{#each revoked as p (p)}
							<li>
								<Badge variant="danger" style="soft" size="sm"
									>{p}
									<button class="ml-1" onclick={() => removeRevoke(p)} aria-label="Remove">×</button
									>
								</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			{#if error}<Alert class="mt-4" variant="danger">{error}</Alert>{/if}
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Drawer.Close>
			<Button loading={isPending} onclick={onSave}>Apply overrides</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
```

- [ ] **Step 4: Verify + commit**

```bash
git add src/lib/features/users/components/{RoleAssignmentDrawer,ManagerSelectorDrawer,PermissionOverridesPanel}.svelte
git commit -m "feat(users): role / manager / permission-override drawers

Three mutation drawers — atomic role assign/revoke, manager
selection (null clears), permission-override grant/revoke with
atomic-replace semantics matching the backend contract."
```

---

### Task 11: UsersList + UserListRow

**Files:**

- Create: `src/lib/features/users/components/UsersList.svelte`
- Create: `src/lib/features/users/components/UserListRow.svelte`

- [ ] **Step 1: UserListRow**

```svelte
<script lang="ts">
	import { Avatar, Badge, Button, Dropdown } from '$ui';
	import { MoreVertical, UserMinus, UserPlus, Shield, Users, Lock, Unlock, Icon } from '$icons';
	import {
		userStatusBadge,
		userRoleBadges,
		managerLabel,
		canDeactivate
	} from '$features/users/view-models';
	import { displayName, initials } from '$features/auth/view-models';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';

	type Props = {
		user: UserDto;
		onAction: (
			action: 'deactivate' | 'reactivate' | 'roles' | 'manager' | 'permissions' | 'unlock',
			user: UserDto
		) => void;
	};

	let { user, onAction }: Props = $props();

	const status = $derived(userStatusBadge(user.status));
	const roles = $derived(userRoleBadges(user, users.roles));
	const manager = $derived(managerLabel(user, users.list));
</script>

<li
	class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3"
>
	<Avatar initials={initials(user)} size="md" />
	<div class="stack stack-tight min-w-0">
		<span class="body-base truncate font-medium text-[var(--color-fg)]">{displayName(user)}</span>
		<span class="caption truncate text-[var(--color-fg-muted)]">{user.email}</span>
	</div>
	<div class="stack stack-tight hidden md:flex">
		<span class="caption text-[var(--color-fg-muted)]">{user.designation || '—'}</span>
		<span class="caption text-[var(--color-fg-subtle)]">{user.department || '—'}</span>
	</div>
	<div class="cluster cluster-tight">
		{#each roles as r (r.id)}
			<Badge variant="brand" style="soft" size="sm">{r.name}</Badge>
		{/each}
		<Badge variant={status.variant} style="soft" size="sm">{status.label}</Badge>
	</div>
	<Dropdown.Root>
		<Dropdown.Trigger>
			<Button variant="ghost" size="sm" aria-label="Row actions">
				<Icon icon={MoreVertical} size="sm" />
			</Button>
		</Dropdown.Trigger>
		<Dropdown.Menu>
			<Dropdown.Item onclick={() => onAction('roles', user)}>
				<Icon icon={Shield} size="sm" /> Manage roles
			</Dropdown.Item>
			<Dropdown.Item onclick={() => onAction('manager', user)}>
				<Icon icon={Users} size="sm" /> Set manager
			</Dropdown.Item>
			<Dropdown.Item onclick={() => onAction('permissions', user)}>
				<Icon icon={Lock} size="sm" /> Permission overrides
			</Dropdown.Item>
			<Dropdown.Separator />
			<Dropdown.Item onclick={() => onAction('unlock', user)}>
				<Icon icon={Unlock} size="sm" /> Unlock
			</Dropdown.Item>
			{#if canDeactivate(user)}
				<Dropdown.Item variant="danger" onclick={() => onAction('deactivate', user)}>
					<Icon icon={UserMinus} size="sm" /> Deactivate
				</Dropdown.Item>
			{:else if user.status === 'inactive'}
				<Dropdown.Item onclick={() => onAction('reactivate', user)}>
					<Icon icon={UserPlus} size="sm" /> Reactivate
				</Dropdown.Item>
			{/if}
		</Dropdown.Menu>
	</Dropdown.Root>
</li>

{#if manager}
	<!-- Manager line consumed by aria label / reserved for future detail panel -->
{/if}
```

- [ ] **Step 2: UsersList**

```svelte
<script lang="ts">
	import { Alert, Button, EmptyState, Pagination, Spinner } from '$ui';
	import { Plus, UserPlus, Users as UsersIcon, Icon } from '$icons';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';
	import UserListRow from './UserListRow.svelte';
	import CreateUserDrawer from './CreateUserDrawer.svelte';
	import DeactivateUserDialog from './DeactivateUserDialog.svelte';
	import RoleAssignmentDrawer from './RoleAssignmentDrawer.svelte';
	import ManagerSelectorDrawer from './ManagerSelectorDrawer.svelte';
	import PermissionOverridesPanel from './PermissionOverridesPanel.svelte';

	let createOpen = $state(false);
	let deactivateOpen = $state(false);
	let rolesOpen = $state(false);
	let managerOpen = $state(false);
	let permsOpen = $state(false);
	let targetUser = $state<UserDto | null>(null);

	let search = $state('');
	let page = $state(1);
	const pageSize = 10;

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return users.list;
		return users.list.filter(
			(u) =>
				u.email.toLowerCase().includes(q) ||
				u.first_name.toLowerCase().includes(q) ||
				u.last_name.toLowerCase().includes(q) ||
				u.designation.toLowerCase().includes(q) ||
				u.department.toLowerCase().includes(q)
		);
	});

	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const paged = $derived(filtered.slice((page - 1) * pageSize, page * pageSize));

	function onAction(
		action: 'deactivate' | 'reactivate' | 'roles' | 'manager' | 'permissions' | 'unlock',
		user: UserDto
	) {
		targetUser = user;
		switch (action) {
			case 'deactivate':
				deactivateOpen = true;
				break;
			case 'reactivate':
				users.reactivate(user.membership_id).catch(() => {});
				break;
			case 'unlock':
				users.unlock(user.membership_id).catch(() => {});
				break;
			case 'roles':
				rolesOpen = true;
				break;
			case 'manager':
				managerOpen = true;
				break;
			case 'permissions':
				permsOpen = true;
				break;
		}
	}
</script>

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Team</h1>
			<p class="caption text-[var(--color-fg-muted)]">
				{users.list.length} member{users.list.length === 1 ? '' : 's'}
			</p>
		</div>
		<div class="cluster">
			<input
				type="search"
				placeholder="Search by name, email, role…"
				bind:value={search}
				class="glass-input w-64 rounded-md px-3 py-2 text-sm"
			/>
			<Button onclick={() => (createOpen = true)}>
				<Icon icon={Plus} size="sm" /> Add member
			</Button>
		</div>
	</header>

	{#if users.status === 'loading'}
		<div class="flex justify-center py-16"><Spinner size={32} /></div>
	{:else if users.status === 'error' && users.error}
		<Alert variant="danger" title="Couldn't load members">{users.error}</Alert>
	{:else if filtered.length === 0}
		<EmptyState
			icon={UsersIcon}
			title={search ? 'No matches' : 'No team members yet'}
			description={search
				? 'Try a different search term.'
				: 'Invite your first member to start collaborating.'}
		>
			{#snippet action()}
				{#if !search}
					<Button onclick={() => (createOpen = true)}>
						<Icon icon={UserPlus} size="sm" /> Add member
					</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<ul class="stack stack-tight" aria-label="Team members">
			{#each paged as user (user.membership_id)}
				<UserListRow {user} {onAction} />
			{/each}
		</ul>
		<Pagination {page} {pageCount} onChange={(p) => (page = p)} />
	{/if}
</div>

<CreateUserDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<DeactivateUserDialog
	bind:open={deactivateOpen}
	user={targetUser}
	onOpenChange={(o) => (deactivateOpen = o)}
/>
<RoleAssignmentDrawer
	bind:open={rolesOpen}
	user={targetUser}
	onOpenChange={(o) => (rolesOpen = o)}
/>
<ManagerSelectorDrawer
	bind:open={managerOpen}
	user={targetUser}
	onOpenChange={(o) => (managerOpen = o)}
/>
<PermissionOverridesPanel
	bind:open={permsOpen}
	user={targetUser}
	onOpenChange={(o) => (permsOpen = o)}
/>
```

- [ ] **Step 3: Verify + commit**

```bash
git add src/lib/features/users/components/{UsersList,UserListRow}.svelte
git commit -m "feat(users): UsersList + UserListRow

Paginated table with search filter, status badge, role chips,
row-action Dropdown. All drawers/dialogs wired with a shared
targetUser state so opening any flow knows which row was clicked."
```

---

### Task 12: /settings/users route + page

**Files:**

- Create: `src/routes/(app)/settings/users/+page.ts`
- Create: `src/routes/(app)/settings/users/+page.svelte`

- [ ] **Step 1: Route guard (+page.ts)**

```ts
import { redirect } from '@sveltejs/kit';
import { session } from '$features/auth/stores/session.svelte';
import { hasPermission } from '$features/auth/tier';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	if (!hasPermission(session.principal, 'identity.users.view')) {
		throw redirect(303, '/dashboard');
	}
};
```

- [ ] **Step 2: Page (+page.svelte)**

```svelte
<script lang="ts">
	import UsersList from '$features/users/components/UsersList.svelte';
	import { users } from '$features/users/stores/users.svelte';

	$effect(() => {
		if (users.status === 'idle') {
			users.load().catch(() => {});
		}
	});
</script>

<svelte:head>
	<title>Team · LeadKart</title>
</svelte:head>

<UsersList />
```

- [ ] **Step 3: Verify build + commit**

```bash
git add "src/routes/(app)/settings/users"
git commit -m "feat(users): /settings/users route

Route gated on identity.users.view in +page.ts. Page lazy-loads
the store on idle and renders UsersList. Sidebar entry already
exists in TENANT_ADMIN_NAV with the same requires perm."
```

---

### Task 13: Playwright e2e — users management round-trip

**Files:**

- Create: `tests/e2e/tenant-user-management.spec.ts`

- [ ] **Step 1: Survey patterns**

Look at `tests/e2e/account-self-service.spec.ts` for the established route-mock pattern. Build on top.

- [ ] **Step 2: Write the spec**

```ts
import { test, expect } from '@playwright/test';
import { fakeLoginResponse } from './helpers/fake-jwt';

async function signInAsAdmin(page) {
	await page.route('**/api/v1/auth/login', (route) =>
		route.fulfill({
			status: 200,
			json: fakeLoginResponse({
				permissions: [
					'identity.users.view',
					'identity.users.create',
					'identity.users.deactivate',
					'identity.roles.assign'
				]
			})
		})
	);
	await page.route('**/api/v1/users', (route) => {
		if (route.request().method() === 'GET') {
			return route.fulfill({ status: 200, json: { users: [] } });
		}
		if (route.request().method() === 'POST') {
			return route.fulfill({
				status: 201,
				json: { person_id: 'p_new', membership_id: 'm_new', person_existed: false }
			});
		}
		return route.continue();
	});
	await page.route('**/api/v1/roles', (route) =>
		route.fulfill({ status: 200, json: { roles: [] } })
	);
	await page.goto('/signin');
	await page.getByRole('textbox', { name: /email/i }).fill('admin@e2e.test');
	await page.getByRole('textbox', { name: /password/i }).fill('Test1234!');
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL(/\/dashboard$/);
}

test('users page: empty state renders + add-member opens drawer', async ({ page }) => {
	await signInAsAdmin(page);
	await page.goto('/settings/users');
	await expect(page.getByRole('heading', { name: /team/i })).toBeVisible();
	await expect(page.getByText(/no team members yet/i)).toBeVisible();
	await page
		.getByRole('button', { name: /add member/i })
		.first()
		.click();
	await expect(page.getByRole('heading', { name: /add team member/i })).toBeVisible();
});

test('users page: a11y serious/critical clean', async ({ page }) => {
	await signInAsAdmin(page);
	await page.goto('/settings/users');
	const { default: AxeBuilder } = await import('@axe-core/playwright');
	const results = await new AxeBuilder({ page }).include('main').analyze();
	const serious = results.violations.filter(
		(v) => v.impact === 'serious' || v.impact === 'critical'
	);
	expect(serious).toEqual([]);
});
```

- [ ] **Step 3: Verify discovery + commit**

Run: `npx playwright test --list tests/e2e/tenant-user-management.spec.ts` → expect 6 instances (2 tests × 3 browsers).

```bash
git add tests/e2e/tenant-user-management.spec.ts
git commit -m "test(e2e): tenant user management — empty + a11y

Empty-state renders + Add member drawer opens. axe scoped to
main serious/critical clean. Mocks roles list as empty to test
the no-catalogue case."
```

---

### Task 14: CI verification

- [ ] **Step 1: Run the full gate**

```
npm run lint && npm run check && npm run test:coverage && npm run build && npx size-limit
npx playwright test --list
```

All must pass. Push:

```
git push origin feat/theme-customizer
```

---

## Acceptance criteria

- [ ] `/settings/users` route exists, gated on `identity.users.view`
- [ ] Page shows paginated list of tenant members with search filter
- [ ] Row has Avatar (initials), display name, email, designation/dept (md+), role badges, status badge, row-action Dropdown
- [ ] Add member opens Drawer; on 201 shows person_existed callout when applicable
- [ ] Deactivate opens ConfirmDialog with required reason capture
- [ ] Reactivate / Unlock run directly from the row Dropdown
- [ ] Roles drawer lists assigned (with revoke) + available (with assign) roles
- [ ] Manager drawer lets user pick another active member as their manager (or clear)
- [ ] Permission overrides panel collects atomic grant/revoke arrays, sends as a single PATCH
- [ ] Compound primitives extracted: `Drawer`, `Dialog`, `Dropdown` (folder + namespace barrel)
- [ ] Singleton primitives extracted: `ConfirmDialog`, `Pagination`, `Avatar`, `EmptyState`
- [ ] All visuals via tokens — no inline hex/rgb/oklch
- [ ] vitest unit (schemas + view-models) passes
- [ ] playwright discovery clean + axe serious/critical clean on `/settings/users`
- [ ] CI gate green
