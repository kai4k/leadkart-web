# Identity module completion — design

**Date:** 2026-05-18
**Branch:** `feat/theme-customizer` (will fork to per-slice feature branches)
**Status:** Draft, awaiting user review

---

## 1. Goal

Complete the LeadKart SPA's Identity module per BRD §6.1 — every surface the
backend exposes that's not yet rendered. Six independent slices, sequenced
to maximise primitive reuse and minimise rework.

## 2. Scope inventory (BRD §6.1 mapped to SPA surfaces)

| BRD surface                                                                         | Status today | Slice |
| ----------------------------------------------------------------------------------- | ------------ | ----- |
| Login, refresh, logout, change-password                                             | ✓ shipped    | —     |
| Tenant settings (profile/contact/statutory/preferences)                             | ✓ shipped    | —     |
| Own profile, active sessions list/revoke                                            | ✗ missing    | **1** |
| Tenant user management (list/create/deactivate/roles/manager/perms)                 | ✗ missing    | **2** |
| Tenant roles management (list/create/permissions/hierarchy)                         | ✗ missing    | **3** |
| Operator tenant management (list/create/suspend/activate/mark-for-deletion/restore) | ✗ missing    | **4** |
| Platform people management (list/global-suspend/anonymise)                          | ✗ missing    | **5** |
| Operator impersonation (start/end/banner/reason capture)                            | ✗ missing    | **6** |

## 3. Non-goals (explicitly out of scope)

Restating bans already implicit in CLAUDE.md / `lib/features/auth/api.ts` so
they don't slip into a plan:

- Self-serve signup, forgot-password, reset-password, 2FA, self-service
  email change — backend has them, product model bans them in this SPA.
  Users who forget passwords ask their tenant admin to reset.
- Avatar image upload — no backend endpoint. We render initials-on-token
  gradient and skip upload entirely.
- Audit-log viewer UI (BRD §11 open item) — separate slice, deferred.
- Bulk user import (BRD §11) — backend ready, frontend deferred.
- Subscription / billing UI (BRD §4.10 — Phase 2).
- Editing the caller's own name or email from the profile page — name +
  email are admin-controlled per backend contract (`PATCH /users/{id}/profile`
  only accepts designation, department, status_message).

## 4. Cross-cutting design

### 4.1 Layering (per CLAUDE.md gateway → service → VM → component)

Every slice obeys the established four layers. No deviations.

```
lib/features/<slice>/
├── api.ts            — gateway: HTTP + zod parse at boundary
├── schemas.ts        — zod schemas for request/response DTOs
├── types.ts          — TypeScript inferred from schemas
├── view-models.ts    — pure functions: DTO → render shape (no async)
└── stores/
    └── <thing>.svelte.ts  — class store with $state fields
                              (lists, current, status, mutate methods)
```

Components consume the store + VM only — never the gateway directly,
never raw API DTOs.

### 4.2 RBAC pattern

Two-tier gating, plus a server gate that's the only real one:

1. **Nav filter** (`lib/config/nav.ts`) — `requires` field hides links
   the user lacks permission for. UX courtesy only.
2. **Route guard** (`+page.ts` `load`) — calls `hasPermission(session.principal, '<perm>')`,
   throws `redirect(303, '/dashboard')` on fail. Prevents bookmarked /
   typed access.
3. **Server enforces** via RLS + `RequirePermission` middleware. The
   server is the actual gate; SuperUser short-circuits via
   `is_super_user` JWT claim.

### 4.3 Primitives strategy

Domiex primitives are Svelte 4 (`export let`, `<slot>`, `on:click`,
`writable` stores) with hand-rolled headless behavior that has a11y
gaps. We DO NOT literal-copy. Instead, the cherry-pick recipe for every
primitive is:

| Source                                  | What we take                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `bits-ui@2.18`                          | Headless behavior — focus trap, ESC, click-outside, ARIA roles, keyboard nav. (Already installed.)       |
| Domiex `lib/components/ui/<primitive>/` | Markup composition shape (Header/Body/Footer slot organisation, layout density, label placement)         |
| LeadKart tokens                         | All visuals — `var(--color-*)`, `.glass-card`, `.glass-input`, `.glass-pill`, `.label-*`, spacing tokens |

Concrete adaptations:

- Domiex `writable` store → Svelte 5 `class` with `$state` fields
- Domiex `export let prop` → `$props()` destructure
- Domiex `<slot>` → Svelte 5 `children: Snippet` + `{@render children()}`
- Domiex `on:click` → `onclick`
- Domiex `$$props` rest → `let { class: className, ...rest } = $props()`
- Domiex hard-coded `badge-{color}` class map → variant prop dispatching
  to our `var(--color-{success,warning,danger,info}-{50,900})` token pairs

### 4.4 Component folder convention (FAANG-canonical, shadcn-svelte pattern)

The codebase already follows shadcn-svelte canon — see existing
`lib/components/ui/card/` (compound namespace) vs `Alert.svelte` /
`Button.svelte` / `Spinner.svelte` (flat singletons). New primitives
extend the same convention. No deviation.

**The rule:**

```
Compound component (multiple parts that compose) → folder + namespace barrel
Singleton component (one file, no parts)         → flat .svelte file under ui/
```

**Compound folder layout** (Vercel Geist / shadcn-svelte / Polaris pattern):

```
lib/components/ui/<name>/
├── <Name>.svelte                 # Root — the wrapper / state provider
├── <Name>Trigger.svelte          # if compound has a trigger
├── <Name>Content.svelte
├── <Name>Header.svelte
├── <Name>Body.svelte             # or 'Content' — match Domiex naming
├── <Name>Footer.svelte
├── <Name>Close.svelte            # close button affordance
└── index.ts                      # namespace barrel
```

`index.ts` shape (mirrors existing `card/index.ts`):

```ts
export { default as Root } from './<Name>.svelte';
export { default as Trigger } from './<Name>Trigger.svelte';
export { default as Content } from './<Name>Content.svelte';
export { default as Header } from './<Name>Header.svelte';
export { default as Body } from './<Name>Body.svelte';
export { default as Footer } from './<Name>Footer.svelte';
export { default as Close } from './<Name>Close.svelte';
```

Top-level barrel `lib/components/ui/index.ts` re-exports as namespace:

```ts
export * as Drawer from './drawer';
export * as Dialog from './dialog';
export * as Dropdown from './dropdown';
export * as Tooltip from './tooltip';
// flat singletons stay singletons
export { default as Badge } from './Badge.svelte';
export { default as Pagination } from './Pagination.svelte';
export { default as Avatar } from './Avatar.svelte';
export { default as Timeline } from './Timeline.svelte';
export { default as EmptyState } from './EmptyState.svelte';
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
```

**Consumption pattern** (matches Card today):

```svelte
import {(Drawer, Dialog, Badge, Pagination, ConfirmDialog)} from '$ui';

<Drawer.Root bind:open>
	<Drawer.Content>
		<Drawer.Header>...</Drawer.Header>
		<Drawer.Body>...</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>Cancel</Drawer.Close>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
```

**File / directory naming:**

- Folder names: lowercase kebab-case (`drawer/`, `dialog/`, `dropdown/`, `tooltip/`). Matches existing `card/`.
- Component files: PascalCase, prefixed with the namespace (`Drawer.svelte`, `DrawerHeader.svelte`). Matches existing `Card.svelte` / `CardHeader.svelte`.
- `index.ts` barrels: lowercase, no exceptions.
- One barrel per folder. Top-level `ui/index.ts` only re-exports — never declares.

**Why this and not alternatives:**

- **Per-component folder for EVERY component** (Polaris / Geist strict) — heavier; would force migrating existing flat singletons (`Button.svelte`, `Alert.svelte`, `Spinner.svelte`) for consistency, which is rework with no payoff. Not adopted.
- **Flat for everything** — breaks down once a primitive has parts (you end up with `DrawerHeader.svelte` colocated next to unrelated singletons). Not adopted.
- **shadcn-svelte hybrid (chosen)** — folder when compound, flat when not. Mirrors the existing `card/` precedent verbatim. Survives `Tabs/Accordion/Combobox` additions later without restructuring.

### 4.5 Primitives needed across the slices

| Primitive                                                                                                 | Behavior source                                                  | Markup anchor                            | First-used slice         | Lives in                                              | Compound?                         |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------- | ------------------------ | ----------------------------------------------------- | --------------------------------- |
| `Drawer.{Root,Trigger,Content,Header,Body,Footer,Close}`                                                  | bits-ui `Dialog` (side="right")                                  | Domiex `ui/drawer/*`                     | 2 (create-user)          | `lib/components/ui/drawer/`                           | **yes**                           |
| `Dialog.{Root,Trigger,Content,Header,Body,Footer,Close}`                                                  | bits-ui `Dialog`                                                 | Domiex `ui/modal/*`                      | 2 (deactivate confirm)   | `lib/components/ui/dialog/`                           | **yes**                           |
| `ConfirmDialog` (composed on `Dialog` — title + body + confirm/cancel)                                    | n/a                                                              | Bespoke                                  | 2                        | `lib/components/ui/ConfirmDialog.svelte`              | no (singleton)                    |
| `Dropdown.{Root,Trigger,Menu,Item,Separator}`                                                             | bits-ui `DropdownMenu`                                           | Domiex `ui/dropdown/*`                   | 2 (row actions)          | `lib/components/ui/dropdown/`                         | **yes**                           |
| `Tooltip.{Root,Trigger,Content}`                                                                          | bits-ui `Tooltip`                                                | Generic                                  | 3 (perm descriptions)    | `lib/components/ui/tooltip/`                          | **yes**                           |
| `Badge` (variants: `success`/`warning`/`danger`/`info`/`neutral`; sub-variants: `solid`/`soft`/`outline`) | n/a                                                              | Domiex `ui/badge/Badge.svelte`           | 1 (session-current pill) | `lib/components/ui/Badge.svelte`                      | no                                |
| `Pagination` (prev/numbered/next)                                                                         | n/a                                                              | Domiex `ui/pagination/Pagination.svelte` | 2 (users list)           | `lib/components/ui/Pagination.svelte`                 | no                                |
| `Avatar` (initials on token gradient; sizes `sm`/`md`/`lg`)                                               | n/a                                                              | Bespoke                                  | 2 (user rows)            | `lib/components/ui/Avatar.svelte`                     | no                                |
| `Timeline` (vertical: dot + content per row)                                                              | n/a                                                              | Domiex `ui/timeline/*`                   | 5 (person audit log)     | `lib/components/ui/Timeline.svelte`                   | no                                |
| `EmptyState` (icon + title + caption + optional CTA)                                                      | n/a                                                              | Bespoke                                  | 2 (empty users list)     | `lib/components/ui/EmptyState.svelte`                 | no                                |
| `PermissionTree` (hierarchical checkbox tree)                                                             | bespoke (refs GitHub org perms, Auth0 RBAC matrix, Linear admin) | bespoke                                  | 3 (roles edit)           | `lib/features/roles/components/PermissionTree.svelte` | feature-local, not a ui primitive |

**Why `Avatar` is singleton not compound:** could plausibly grow `Avatar.Group` later. If/when that happens, promote `Avatar.svelte` → `avatar/{Avatar.svelte, AvatarGroup.svelte, index.ts}` per the convention. Don't pre-promote (YAGNI).

**Why `ConfirmDialog` is singleton not compound:** it's a _composition_ of Dialog, not a primitive with its own parts. Consumers don't need `ConfirmDialog.Header` — they get the Dialog parts via the composition's internal use.

**Extraction order** (NOT pre-built; built as slices demand):

- **Slice 1** builds nothing new — uses TextField/Button/Card primitives that exist. Only `Badge` (used in topbar dot already; needs a real primitive) lands here for the "current session" pill. Drawer/Modal not yet needed.
- **Slice 2** builds `Drawer`, `Dialog` + `ConfirmDialog`, `Dropdown`, `Pagination`, `Avatar` inline as feature components first if they look tightly bound, then promote to `lib/components/ui/` once slice 3 wants them. Per Rule of Three — but realistically these are obviously reusable on inspection; promote eagerly.
- **Slice 3** introduces `Tooltip`. Refines existing primitives.
- **Slice 5** introduces `Timeline`.

### 4.6 Nav additions

- `/settings/account` — replace the redirect with a layout that has sub-nav (Profile · Security · Sessions). Sidebar entry keeps the single `/settings/account/security` href but layout sub-nav exposes the siblings.
- `/settings/users` and `/settings/roles` already in `TENANT_ADMIN_NAV` — slices 2 & 3 just light them up.
- New platform-tier entries for slices 4-6:
  ```ts
  // PLATFORM_NAV: Administration section
  { href: '/operator/tenants',      label: 'Tenants',     icon: Building2, requires: 'platform.tenants.view' },
  { href: '/operator/people',       label: 'Platform users', icon: Users,  requires: 'platform.users.view'   },
  // Impersonation is a per-tenant action triggered from /operator/tenants/{id}, not a nav root
  ```

### 4.7 Testing baseline (mandatory per slice)

- **Vitest unit**: view-models (pure transforms) + zod schemas (round-trip valid + invalid samples)
- **Playwright e2e**: golden-path round-trip for each new screen — at minimum, "land on page, see expected data, perform primary action, see result"
- **axe-core a11y**: every new route asserts zero serious/critical WCAG 2.2 AA violations
- **size-limit**: bundle stays within existing budgets (≤350 KB JS gzip / ≤60 KB CSS gzip / ≤60 KB initial route gzip)

### 4.8 Error UX baseline

- API client's existing 401/403 retry-then-redirect-to-signin handles auth expiry — no per-slice work needed.
- Per-slice errors surface via `Alert` primitive at the top of the page or inside the drawer/dialog they originated in.
- Confirm dialogs show inline busy state on the confirm button (`Spinner` inside `Button`) and disable the cancel button while pending.
- Lists show three states: loading (skeleton via `animate-shimmer` utility), empty (`EmptyState` primitive), error (`Alert` with retry).

---

## 5. Per-slice design

### 5.1 Slice 1 — Account self-service

**Routes** (all under existing `(app)/settings/account/`):

| Path                                      | Role     | Notes                                                                                                                                    |
| ----------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/settings/account/+layout.svelte`        | new      | Header (user name + tier badge) + sub-nav (Profile / Security / Sessions). Loads profile + sessions stores on first mount via `$effect`. |
| `/settings/account/+page.ts`              | reshape  | Redirect target changes from `/security` to `/profile`.                                                                                  |
| `/settings/account/profile/+page.svelte`  | new      | Renders `ProfileForm`.                                                                                                                   |
| `/settings/account/security/+page.svelte` | existing | Unchanged — `ChangePasswordForm`.                                                                                                        |
| `/settings/account/sessions/+page.svelte` | new      | Renders `SessionsList`.                                                                                                                  |

**Permissions:** none (signed-in is enough; server scopes data to caller's own identity).

**Gateway additions** (`lib/features/auth/api.ts`):

```ts
getMyProfile(): Promise<UserDto>                        // GET /v1/users/{my-membership-id}
updateMyProfile(patch: ProfileUpdate): Promise<void>    // PATCH /v1/users/{my-id}/profile
listSessions(): Promise<SessionDto[]>                   // GET /v1/auth/sessions
revokeSession(familyId: string): Promise<void>          // DELETE /v1/auth/sessions/{familyId}
revokeOtherSessions(reason?: string): Promise<{revoked: number}>  // DELETE /v1/auth/sessions  (body: { except_current: true, reason })
```

**Schemas** (`auth/schemas.ts`): `userDtoSchema`, `sessionDtoSchema`, `listSessionsResponseSchema`, `updateProfileRequestSchema`.

**Stores** (`auth/stores/`):

- `profile.svelte.ts` — class `ProfileStore { current, status, load(), update(patch) }`
- `sessions.svelte.ts` — class `SessionsStore { list, status, load(), revoke(id), revokeOthers() }`

**View-models** (`auth/view-models.ts`):

- `displayName(person)` — "First Last" or initials fallback
- `initials(person)` — two-letter monogram for Avatar
- `lastSeenLabel(timestamp)` — "2 hours ago" / "Apr 15"
- `isCurrentSession(session, principal)` — match `session.family_id` against the family in the current refresh token

**Components** (`auth/components/`):

- `ProfileForm.svelte` — read-only name + email block, editable designation/department/status_message via TextField, Save button via Button primitive
- `SessionsList.svelte` — Card.Root rows; each row: device label, last-seen, created-at, "current" Badge if applicable, Dropdown row-actions (Revoke). "Revoke all other sessions" button at top right calls revokeOthers with confirm.

**Domiex anchor:** `pages-account-settings` (form structure) + `pages-account-security` (sessions visual reference — sub Domiex's recent-activity list pattern).

**New primitives:** `Badge` lands here (single use first; slice 2 multiplies it).

### 5.2 Slice 2 — Tenant user management

**Routes:**

| Path                                | Role                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `/settings/users/+page.svelte`      | List page: paginated table                                                       |
| `/settings/users/+page.ts`          | Load guard: `hasPermission('identity.users.view')` else redirect to `/dashboard` |
| `/settings/users/[id]/+page.svelte` | Detail page (deferable to slice 2.5 — V1 row-actions cover everything)           |

**Permissions:** route requires `identity.users.view`. Sub-actions gated:

- Create button → `identity.users.create`
- Deactivate / Reactivate → `identity.users.deactivate` / `identity.users.reactivate`
- Unlock → `identity.users.unlock`
- Assign role → `identity.roles.assign` + `identity.roles.view` (need role catalogue to choose from)
- Manager assignment → `identity.users.update`
- Permission overrides → `identity.users.update_permissions`

**Gateway** (`lib/features/users/api.ts`):

```ts
listUsers(query?: { cursor?: string, search?: string, status?: 'active'|'inactive'|'all' }): Promise<UserListResponse>
getUser(id: string): Promise<UserDto>
createUser(req: CreateUserRequest): Promise<CreateUserResponse>  // returns { person_id, membership_id, person_existed }
updateUserProfile(id: string, patch: ProfileUpdate): Promise<void>
deactivateUser(id: string, reason: string): Promise<void>
reactivateUser(id: string): Promise<void>
assignRole(id: string, roleId: string): Promise<void>
revokeRole(id: string, roleId: string): Promise<void>
updatePermissionOverrides(id: string, overrides: PermissionOverrides): Promise<void>
assignManager(id: string, managerId: string): Promise<void>
removeManager(id: string): Promise<void>
unlockUser(id: string): Promise<void>
```

**Schemas:** `userDtoSchema` (reuse from auth feature), `createUserRequestSchema`, `createUserResponseSchema`, `listUsersResponseSchema`, plus role-summary schema for the assignment drawer.

**Stores** (`users/stores/users.svelte.ts`):

- `UsersStore { list, pagination, filters, status, load(), refresh(), create(req), update(id, patch), deactivate(id, reason), … }`

**View-models** (`users/view-models.ts`):

- `userStatusBadge(status)` → `{ label, variant }`
- `userRoleBadges(roleIds, catalogue)` → renderable list (uses role catalogue from slice 3's store or a thin lookup)
- `userListColumns()` → column config for the table

**Components** (`users/components/`):

- `UsersList.svelte` — table of users with sort + pagination
- `UserListRow.svelte` — single row with Avatar, name+email, role chips, status Badge, last-seen, row-action Dropdown
- `CreateUserDrawer.svelte` — Drawer with email+password+first_name+last_name; on success shows "Person attached to existing account" callout when `person_existed === true`
- `DeactivateUserDialog.svelte` — ConfirmDialog wrapping a reason textarea
- `RoleAssignmentDrawer.svelte` — multi-select role list (uses roles catalogue from slice 3 OR a temporary inline load until slice 3 lands)
- `ManagerSelectorDrawer.svelte` — Select over current users
- `PermissionOverridesPanel.svelte` — grant/revoke list with the resolved-permissions preview

**Domiex anchor:** `apps-hospital-staff-lists` (table + sort + pagination + add-via-Modal-trigger + row-action patterns). Retokenized.

**New primitives:** `Drawer`, `Dialog` + `ConfirmDialog`, `Dropdown`, `Pagination`, `Avatar`, `EmptyState` all land here.

**Slice 3 dependency:** Role-assignment UI ideally consumes slice 3's roles store. If slice 3 hasn't landed, fall back to inline `GET /v1/roles` load inside the assignment drawer.

### 5.3 Slice 3 — Tenant roles management

**Routes:**

| Path                                | Role                                          |
| ----------------------------------- | --------------------------------------------- |
| `/settings/roles/+page.svelte`      | Roles list (cards or table)                   |
| `/settings/roles/+page.ts`          | Guard: `hasPermission('identity.roles.view')` |
| `/settings/roles/[id]/+page.svelte` | Role detail with PermissionTree editor        |

**Permissions:** `identity.roles.view`. Sub-actions: `create`, `update`, `delete`.

**Gateway** (`lib/features/roles/api.ts`):

```ts
listRoles(): Promise<RoleDto[]>
getRole(id: string): Promise<RoleDetailDto>
createRole(req: CreateRoleRequest): Promise<{ role_id: string }>
updateRole(id: string, patch: RoleUpdate): Promise<void>
setPermissions(id: string, permissions: string[]): Promise<void>     // PUT — full replace
grantPermission(id: string, permission: string): Promise<void>       // POST — delta
revokePermission(id: string, permission: string): Promise<void>      // delta
deleteRole(id: string): Promise<void>
```

**Permission catalogue source:** Backend exposes the canonical permission list somewhere — needs verification (likely `GET /v1/permissions` or hardcoded in the catalogue Go file). **OPEN QUESTION: confirm catalogue endpoint exists; if not, we hardcode the same string list on the frontend mirroring the Go constants.**

**Components** (`roles/components/`):

- `RolesList.svelte` — list (one role per row, full-width Card.Root) — name, member count, "system" Badge for SuperAdmin/built-ins, row-action Dropdown. A grid was considered but loses the per-role member-count column readability; the list pattern carries from slice 2's users-list shape (consistency over variety).
- `CreateRoleDrawer.svelte` — name + description
- `RoleDetailPanel.svelte` — role metadata edit + member list (the users with this role assigned, sourced from slice 2's gateway)
- `PermissionTree.svelte` — hierarchical checkbox tree grouped by namespace (`identity.*`, `platform.*`, `crm.*`, etc.), with parent indeterminate state when leaves mixed. Uses Tooltip to show each permission's description.

**Domiex anchor:** None for the tree itself. Card-list for the roles list draws on `apps-projects-users` card-grid shape. Industry refs for the tree: GitHub org permissions screen, Auth0 RBAC matrix, Linear admin role editor.

**New primitives:** `Tooltip`. Possibly refine `Dialog`/`Drawer` based on slice 2 learnings.

### 5.4 Slice 4 — Operator tenant management

**Routes:**

| Path                                  | Role                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/operator/tenants/+page.svelte`      | Tenants list                                                                                |
| `/operator/tenants/+page.ts`          | Guard: `hasPermission('platform.tenants.view')`                                             |
| `/operator/tenants/[id]/+page.svelte` | Tenant detail (profile / statutory / members / activity tabs via sub-routes or in-page nav) |

**Permissions:** `platform.tenants.view`. Sub-actions: `platform.tenants.create`, `platform.tenants.manage` (suspend / activate / mark-for-deletion / restore).

**Gateway** (`lib/features/operator/tenants/api.ts`):

```ts
listTenants(query?: { cursor?, search?, status? }): Promise<TenantListResponse>   // ⚠️ ENDPOINT MAY NOT EXIST — backend prereq
getTenant(id: string): Promise<TenantDto>
createTenant(req: RegisterTenantRequest): Promise<RegisterTenantResponse>          // POST /v1/tenants — currently unauth on backend
suspendTenant(id: string, reason: string): Promise<void>
activateTenant(id: string): Promise<void>
markForDeletion(id: string, reason: string): Promise<void>
restoreTenant(id: string): Promise<void>
```

**Backend gaps to flag:**

1. **`GET /v1/tenants` (list) is not visible in `tenant_http.go`** — needs to be added to the Go backend before slice 4 list page works.
2. **`POST /v1/tenants` is currently unauthenticated** on the Go backend — the frontend gates on `platform.tenants.create` regardless, but the server-side hardening is a separate task.

**Components** (`operator/tenants/components/`):

- `TenantsList.svelte` — paginated list with status pill (Active / Suspended / Marked-for-deletion)
- `CreateTenantDrawer.svelte` — fields: slug, legal_name, display_name, admin_email, admin_password, admin_first_name, admin_last_name. On 201, drawer transitions to a "share credentials" view: admin email + password rendered with copy-buttons, prominent warning ("Share securely once; not retrievable"), instructions about `mustChangePassword` forced first-login flow.
- `SuspendTenantDialog.svelte` — ConfirmDialog + reason textarea (required, ≥ 5 chars)
- `MarkForDeletionDialog.svelte` — ConfirmDialog + reason + bold "Reversible for 30 days" caption
- `TenantDetailPage.svelte` — profile section, statutory section, member-count card, action panel
- `TenantActionPanel.svelte` — buttons for suspend/activate/mark/restore depending on current status

**Domiex anchor:** Same `apps-hospital-staff-lists` shape for the list, retargeted. Detail page borrows `pages-user` card-section pattern.

### 5.5 Slice 5 — Platform people management

**Routes:**

| Path                                 | Role                                                               |
| ------------------------------------ | ------------------------------------------------------------------ |
| `/operator/people/+page.svelte`      | Persons list (cross-tenant)                                        |
| `/operator/people/+page.ts`          | Guard: `hasPermission('platform.users.view')`                      |
| `/operator/people/[id]/+page.svelte` | Person detail: profile, memberships across tenants, audit timeline |

**Gateway** (`lib/features/operator/people/api.ts`):

```ts
listPersons(query?): Promise<PersonListResponse>
getPerson(id: string): Promise<PersonDetailDto>             // includes Memberships across tenants
globalSuspendPerson(id: string, reason: string): Promise<void>
liftGlobalSuspension(id: string): Promise<void>
anonymisePerson(membershipId: string, reason: string): Promise<void>  // DPDP — POST /v1/users/{userId}/anonymise
```

**Components** (`operator/people/components/`):

- `PeopleList.svelte` — same shape as users list, with membership-count column and global-suspended Badge
- `PersonDetail.svelte` — top-level identity card, list of Memberships with per-tenant context, Timeline of audit events
- `GlobalSuspendDialog.svelte` — ConfirmDialog + reason + warning "All tenant memberships will be deactivated"
- `AnonymiseDialog.svelte` — two-step confirm: (1) explainer with red irreversible warning, (2) admin types the person's email to confirm. Reason required. DPDP per BRD §7.3.

**Domiex anchor:** List shape from `apps-hospital-staff-lists`. Detail page audit-timeline section uses Domiex `ui/timeline/` markup retokenized.

**New primitives:** `Timeline` lands here.

### 5.6 Slice 6 — Operator impersonation

**Routes:** No dedicated route. Triggered from `/operator/tenants/{id}` "Impersonate this tenant" action. Active impersonation indicator is a sticky banner above the topbar (rendered by `(app)/+layout.svelte` when session principal carries impersonation context).

**Backend prereq:** **No impersonation endpoint visible in `identity/ports/*.go`** — slice 6 fully blocked on backend. The BRD specifies `X-SuperUser-Reason` header for cross-tenant mutations and "impersonation session reason" — both imply an endpoint pattern but it's not implemented. Frontend can't proceed until leadkart-go ships:

- `POST /v1/auth/impersonate` `{ target_tenant_id, target_membership_id?, reason }` → returns new token-pair scoped to target
- `POST /v1/auth/end-impersonation` → returns original token-pair (or signs out)

**Components** (deferred until backend ships, design captured for completeness):

- `ImpersonateModal.svelte` — target picker (tenant + optional specific user) + reason textarea (required) + bold warning
- `ActiveImpersonationBanner.svelte` — sticky strip above topbar in `--color-warning-500`; shows impersonated tenant name + "End impersonation" button
- `EndImpersonationButton.svelte` — confirm dialog before swapping tokens back

**Reference patterns:** Auth0 "Impersonate this user", Stripe Connect "View as account", AWS IAM AssumeRole. Banner pattern mirrors Vercel team-switcher chrome.

**Auth wiring:** New impersonation mode on the session store — `session.principal.impersonating` (when set, carries `original_principal_id` + `impersonated_tenant_id`). The `setAuthHooks` callback in `lib/api/client.ts` continues injecting whichever token-pair is active.

---

## 6. Sequencing & dependency chain

```
Slice 1 (Account self-service)
  └─ Builds: Badge
     └─ Slice 2 (Tenant user mgmt)
        └─ Builds: Drawer, Dialog, ConfirmDialog, Dropdown, Pagination, Avatar, EmptyState
           └─ Slice 3 (Tenant roles)
              └─ Builds: Tooltip; consumes slice 2 primitives + roles store
              └─ Slice 4 (Operator tenants)
                 └─ Consumes slice 2 list/drawer/dialog primitives; flags 2 backend gaps
                    └─ Slice 5 (Platform people)
                       └─ Builds: Timeline; consumes slice 4 list shape
                          └─ Slice 6 (Impersonation) — BLOCKED on backend endpoints
```

Slices 2 ↔ 3 have a soft circular dep (slice 2 wants slice 3's role catalogue for the assignment drawer; slice 3 wants slice 2's user gateway for the member list). Resolution: each slice loads its own catalogue if the cross-store isn't available yet. After both land, refactor to use the shared store. No premature abstraction.

---

## 7. Backend prerequisites (leadkart-go gaps)

These need to land on the backend before the corresponding frontend slice
can complete. Flagged here, not blocking the design.

| Gap                                                 | Affects                                    | Severity                                     |
| --------------------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| `GET /v1/tenants` (list) not visible                | Slice 4 list page                          | **Blocker**                                  |
| `POST /v1/tenants` is unauthenticated               | Slice 4 create — frontend gates regardless | Server hardening, not a frontend blocker     |
| Impersonation endpoints missing                     | Slice 6                                    | **Blocker** for slice 6                      |
| Permission catalogue endpoint (or hardcoded mirror) | Slice 3 PermissionTree                     | Need to verify — may already be discoverable |

---

## 8. Open questions

1. **Permission catalogue source** (slice 3): does the backend expose a
   discovery endpoint, or do we mirror `permission.go` constants in
   the frontend? Mirror is simpler but drifts; endpoint is canonical.
2. **Tenant detail tabs** (slice 4): sub-routes (`/operator/tenants/[id]/{profile,statutory,members,activity}`) or single-page sections? Sub-routes match the existing tenant-settings pattern but add four route files. Single-page sections are denser.
3. **Audit log surface** (slice 5 person detail): scope to identity-events only, or pull cross-module events from the future audit-log read endpoint? V1 = identity-events only.
4. **Anonymise UX** (slice 5): does the backend reject anonymise of a still-active Person, or accept and we surface a "person is still active" warning in the dialog? Need to verify backend behaviour.
5. **Session "device label"**: the backend stores whatever the client sends on login. Currently we send nothing on login (no `X-Device-Label` header). Should slice 1 add device label derivation (UA-string-based) on the login call? Improves the sessions list dramatically. Or wait until later.

---

## 9. Out-of-spec items (deferred to later batches)

- Audit-log viewer UI
- Bulk user import (CSV)
- Subscription / billing UI
- Notification preferences UI
- Marketplace / CRM module UIs (per CLAUDE.md roadmap v0.4+)
