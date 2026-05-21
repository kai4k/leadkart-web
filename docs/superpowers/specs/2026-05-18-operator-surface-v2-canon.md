# Operator surface v2 — canonical FAANG-pattern redesign

**Date:** 2026-05-18
**Status:** Draft. Backend wishlist is the deliverable for `leadkart-go`. Frontend spec is the basis for v0.4+ work on this repo.

---

## Reference products and what we borrow from each

| Product                                       | Pattern we adopt                                                                                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stripe Dashboard**                          | Prefix-IDs (`cus_xxxxx`, `acct_xxxxx`) as human-readable resource identifiers; create → detail redirect; cursor-paginated lists; live count widgets via SSE; "View as account" impersonation banner |
| **Linear**                                    | Search-first navigation (Cmd+K typeahead); URL state for filters + sort; per-resource keyed-URL (`/issues/ENG-123`); inline detail panels                                                           |
| **Vercel**                                    | Team/scope switcher in topbar; cursor pagination with hover-preload; granular RBAC by org + project + role                                                                                          |
| **Auth0 Management Console**                  | Email is the canonical user identifier in admin UIs; search-by-email with autocomplete; raw IDs only in deep-links                                                                                  |
| **GitHub Org Admin**                          | Permission matrix UI (rows = roles, columns = permission namespaces); audit log as first-class tab on every detail page                                                                             |
| **AWS IAM Identity Center**                   | AssumeRole pattern for impersonation; explicit "exit role" banner; session timeout countdown                                                                                                        |
| **Notion / Slack**                            | Slug-based workspace URLs (`/workspaces/acme-pharma/...`); never expose internal UUIDs in chrome                                                                                                    |
| **TanStack Query (Linear, GitHub Issues UI)** | Server-state cache with stale-while-revalidate, query-key invalidation on mutation, optimistic updates, refetch-on-window-focus                                                                     |

These are the systems we benchmark against. Everywhere this doc says "canonical" or "FAANG-canon" it means **at least three of the above ship this pattern**.

---

## PART A — Backend wishlist for `leadkart-go`

Every endpoint below is **missing or insufficient** on the current backend. Each one unblocks specific frontend surfaces. Order is roughly by impact on the operator workflow.

### A.1 Resource lookup by slug / email (multi-key endpoints)

The operator never types UUIDs. Backend resources need stable human-readable keys.

**A.1.1 Tenant lookup by slug**

```
GET /api/v1/tenants/by-slug/{slug}
GET /api/v1/platform/tenants/by-slug/{slug}    (operator scope)
→ 200 TenantDto    404 if not found
auth + identity.tenants.view (own) | platform.tenants.view (any)
```

Or — preferred — overload the existing `{id}` param to accept slug OR UUID:

```
GET /api/v1/tenants/{key}    // key matches UUID regex → UUID lookup; otherwise → slug lookup
```

**A.1.2 Person lookup by email**

```
GET /api/v1/platform/persons/by-email/{email}    (email URL-encoded)
→ 200 PersonDto    404 if not found
auth + platform.users.view
```

### A.2 Cursor-paginated list endpoints with server-side search

Frontend cannot ship typeahead search until backend supports filtered, paginated lists. Every list endpoint should follow this contract:

**Request:**

```
GET /api/v1/{resource}?q=<search>&cursor=<opaque>&limit=20&sort=<field>&order=asc|desc&<filter>=<value>
```

- `q` — search term applied across configured fields per resource (see below)
- `cursor` — opaque pagination token (base64 of last-seen primary key + sort tuple)
- `limit` — page size, max 100, default 20
- `sort` — single field by name; backend defines allowed fields per resource
- `order` — `asc` | `desc`
- filter params — per-resource (e.g. `status`, `created_after`)

**Response:**

```json
{
  "items": [/* ResourceDto */],
  "next_cursor": "opaque-string" | null,
  "total_count": 142  // optional; only if backend can compute cheaply
}
```

`total_count` is optional — Stripe ships without it for performance; Linear ships with it for the "page X of Y" affordance. Pick one and stick to it.

**A.2.1 Tenants list — operator scope**

```
GET /api/v1/platform/tenants?q=&cursor=&limit=&sort=&order=&status=
auth + platform.tenants.view
q searches:  display_name, legal_name, slug, gst_number, pan_number
sort fields: created_at, display_name, status, activated_at
filters:     status (active | suspended | marked_for_deletion | pending)
```

The current `GET /v1/platform/tenants` returns the full collection — fine for ≤200 tenants. This is the v2 contract.

**A.2.2 Persons list — operator scope (does not exist today)**

```
GET /api/v1/platform/persons?q=&cursor=&limit=&sort=&order=&filter=
auth + platform.users.view
q searches:  email, first_name, last_name
sort fields: created_at, email, first_name
filters:     is_active, is_globally_suspended, is_anonymised (each bool)
```

**A.2.3 Users list — tenant scope (extend existing)**

```
GET /api/v1/users?q=&cursor=&limit=&sort=&order=&status=&role_id=
auth + identity.users.view
q searches:  email, first_name, last_name, designation, department
sort fields: joined_at, email, status
filters:     status (active | inactive | pending), role_id (UUID — show only members with this role)
```

Current `GET /v1/users` returns the full tenant roster — works for ≤100 members per tenant. Refactor when a tenant exceeds that.

**A.2.4 Roles list — tenant scope (extend existing)**

```
GET /api/v1/roles?q=&cursor=&limit=&sort=
auth + identity.roles.view
q searches:  name
sort fields: name, hierarchy_level, created_at
```

Same as A.2.3 — current implementation returns the full set, which is fine until a tenant has >50 custom roles.

### A.3 Activity / audit-log endpoints

Every detail page in canonical admin UIs has an Audit tab. Today we don't expose the outbox/event log at the read side.

**A.3.1 Tenant audit log**

```
GET /api/v1/platform/tenants/{id}/activity?cursor=&limit=&since=&until=&actor_id=&event_type=
auth + platform.tenants.view
Returns: { items: ActivityDto[], next_cursor }
ActivityDto: { id, event_type, actor_id (membership_id), actor_display_name, target_id, target_type, payload (jsonb), occurred_at }
```

`event_type` enum covers: TenantSuspended, TenantActivated, TenantProfileUpdated, MembershipCreated, MembershipDeactivated, RoleAssigned, RoleRevoked, ImpersonationStarted, ImpersonationEnded, etc. The outbox table already records these — surface them via a read endpoint.

**A.3.2 Person audit log**

```
GET /api/v1/platform/persons/{id}/activity?cursor=&limit=
auth + platform.users.view
```

**A.3.3 Self-service activity for the caller**

```
GET /api/v1/auth/me/activity?cursor=&limit=
auth + any signed-in user
```

Returns the caller's own login history, password changes, sessions opened/revoked. Auth0 ships this as "Logs" under the user's account page.

### A.4 Stats / counters — extended

**A.4.1 Platform stats — existing endpoint, add deltas**

Current `GET /v1/platform/stats` returns absolute counts. Add 24h / 7d / 30d deltas:

```json
{
	"tenants_total": 142,
	"tenants_total_delta_7d": 12,
	"tenants_active": 138,
	"tenants_active_delta_7d": 11,
	"tenants_suspended": 3,
	"persons_total": 487,
	"persons_total_delta_7d": 34,
	"memberships_active": 521,
	"memberships_active_delta_7d": 28
}
```

Stripe Dashboard, Linear, and Vercel all show "+12 this week" style deltas on stats tiles. The delta is the difference vs the same metric N days ago.

**A.4.2 Per-tenant stats**

```
GET /api/v1/platform/tenants/{id}/stats
auth + platform.tenants.view
→ { members_total, members_active, roles_total, sessions_active_last_24h, leads_purchased_30d, … }
```

Used by the tenant detail page's hero section.

### A.5 Optional: real-time stream

For dashboards that need live updates. Lower priority — SSE-on-cache-invalidation-event from the backend.

```
GET /api/v1/platform/stats/stream     // Server-Sent Events
event: stats.tenants_total
data: { value: 143, delta: +1 }
```

OR a single `/events` SSE endpoint with multiplexed event types. Pattern: Stripe Dashboard uses webhooks-derived SSE for the dashboard tiles; the same backend code that fires integration events can fan a subset to subscribed UIs.

Skip in v0.4; revisit in v0.5+.

### A.6 Capabilities endpoint — server-driven UI hints

Replace the brittle frontend `tier.ts` + `nav.ts` permission matrix with a server-rendered capability list.

```
GET /api/v1/auth/me/capabilities
auth + signed-in
→ {
    tier: "platform-super" | "platform-staff" | "tenant-admin" | "tenant-user",
    permissions: ["identity.users.view", ...],
    features: ["operator.tenants.list", "operator.impersonation.enabled", ...],
    nav: [ /* server-controlled nav config — optional, can be derived client-side */ ]
  }
```

Why: every product that ships permission-gated UIs at scale (GitHub, Stripe, Linear, Vercel, Auth0) has the server tell the client what to render. The client should NEVER hardcode "if permission X then show nav Y". The server is the source of truth, and the server can change it without a frontend redeploy.

### A.7 Slug constraint on tenants

Confirm/add: tenant `slug` is **globally unique** (enforce at DB level), URL-safe regex `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`, immutable after creation (or only mutable via a dedicated `POST /tenants/{id}/change-slug` endpoint with conflict detection).

Stripe doesn't let merchants change their account ID. Linear doesn't let teams change their key after issues are filed. Same constraint here.

### A.8 Mutation responses should include the mutated resource

Today most mutations return 204. Canonical: return the updated resource as the response body so the frontend can invalidate + replace the cache entry in one round-trip.

```
PATCH /api/v1/users/{id}/profile    → 200 UserDto  (not 204)
POST  /api/v1/users/{id}/deactivate → 200 UserDto
PATCH /api/v1/roles/{id}            → 200 RoleDto
PATCH /api/v1/tenants/{id}/profile  → 200 TenantDto
```

Stripe, GitHub, Auth0 all return the updated resource on mutation. The frontend doesn't need a follow-up GET to refresh local state.

### A.9 Error response taxonomy

Today errors look like `{ "code": "INVALID_BODY", "message": "..." }`. Extend to a richer shape so the frontend can render structured feedback:

```json
{
	"error": {
		"code": "validation_failed",
		"message": "Request validation failed",
		"fields": {
			"email": "must be a valid email address",
			"password": "must be at least 8 characters"
		},
		"trace_id": "req_a3f5...",
		"retryable": false
	}
}
```

Stripe, Twilio, Auth0 all ship structured field-level errors. The frontend then renders inline per-field error messages without parsing the message string.

### A.10 Impersonation contextual hooks

Today impersonation is audit-only — the operator already has god-mode visibility. To match Stripe Connect / AWS IAM canon, also support:

```
POST /api/v1/platform/impersonation/sessions     → also returns an X-Scoped-Token JWT
                                                    scoped to the target tenant + 30min expiry
```

The frontend then attaches `Authorization: Bearer <scoped_token>` for the duration of the session, scoping ALL subsequent API calls to that tenant as if the operator were logged in as the seed CompanyOwner. End-impersonation revokes the scoped token.

Canonical references: AWS STS `AssumeRole` (returns temporary credentials), Auth0 `Impersonate User` (returns short-lived JWT), Stripe Connect `Account-Override-Token`.

This is the largest backend ask in this doc. Without it, impersonation stays as an audit-recording layer — useful but not "view-as" canonical.

### A.11 Soft-delete + restoration consistency

Confirm: every entity that supports "deactivate / reactivate" or "mark-for-deletion / restore" can be queried while in the inactive state (via a `?include=inactive` flag or distinct status enum value in the list filter). Today `deactivate` cascades to "user can't sign in" — but can an operator still see a deactivated user in the list to reactivate them? Verify the path exists.

### A.12 Bulk endpoints (lower priority, v0.5)

```
POST /api/v1/users/bulk                        body: { users: CreateUserRequest[] }
POST /api/v1/users/bulk-deactivate             body: { membership_ids: [], reason }
POST /api/v1/platform/tenants/bulk-export      → 202 with task_id; poll for completion
```

Bulk import is on the BRD §11 open-items list. Spec'd here for completeness; out of v0.4 scope.

---

## PART B — Frontend redesign

Reorganized per surface. Auth hierarchy, page flow, data fetching, and URL structure for each.

### B.1 Cross-cutting infrastructure (frontend-only, can land NOW)

These don't depend on backend changes. They're the substrate the per-surface pages sit on.

#### B.1.1 Adopt `@tanstack/svelte-query`

Replace the manual class-stores for **server state** (lists, single-resource reads) with query hooks. Class-stores stay for **client state** (UI flags, ephemeral form data).

```ts
// lib/api/query-client.ts
import { QueryClient } from '@tanstack/svelte-query';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000, // 30s SWR window
			gcTime: 5 * 60_000, // 5min cache retention
			retry: (failureCount, error) => {
				// NetworkError + ServerError up to 2 retries; 4xx never
				if (error instanceof NetworkError || error instanceof ServerError) {
					return failureCount < 2;
				}
				return false;
			},
			refetchOnWindowFocus: true,
			refetchOnReconnect: true
		},
		mutations: {
			retry: false // mutations are not idempotent by default
		}
	}
});

// Mount in (app)/+layout.svelte:
// <QueryClientProvider client={queryClient}>
//   {@render children()}
// </QueryClientProvider>
```

```ts
// lib/features/operator/tenants/queries.ts
//
// Cache discipline (as shipped, revised 2026-05-21):
//   - Mutations invalidate; let auto-refetch repopulate.
//   - No manual cross-query setQueryData seeding.
//   - No optimistic rollback dance — invalidate + refetch is simpler.
//   - Toasts in the mutation hook, not in the calling component.
//
// Active-tenant resolution is server-side (SSR layout reads cookie,
// fetches canonical TenantDto, exposes via page.data.tenant). There
// is no client-side tenantBySlugQuery — slug never enters the browser
// path layer.
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import * as api from './api';
import { toast } from '$ui';

export const tenantsKeys = {
	all: ['tenants'] as const,
	list: () => [...tenantsKeys.all, 'list'] as const,
	detail: (id: string) => [...tenantsKeys.all, 'detail', id] as const
};

export function tenantsListQuery() {
	return createQuery(() => ({
		queryKey: tenantsKeys.list(),
		queryFn: () => api.listTenants()
	}));
}

export function tenantDetailQuery(tenantId: string) {
	return createQuery(() => ({
		queryKey: tenantsKeys.detail(tenantId),
		queryFn: () => api.getTenant(tenantId),
		enabled: !!tenantId
	}));
}

export function suspendTenantMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			api.suspendTenant(id, { reason }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: tenantsKeys.all });
			toast('success', 'Tenant suspended');
		}
	}));
}
```

**Revisions from the earlier draft (recorded 2026-05-21):**

- `tenantBySlugQuery` removed. Slug → UUID resolution is now done by the BFF on `POST /api/operator/scope`; the active-tenant DTO is fetched by `+layout.server.ts` and exposed via `page.data.tenant`.
- Cache keys use UUIDs not slugs (matches the underlying API path).
- Cross-query cache seeding (`qc.setQueryData(detail, …)` on list fetch, manual detail updates on mutation) is gone — TanStack canon is invalidate + auto-refetch.
- Optimistic rollback (`onMutate` + manual `setQueryData` rollback on error) is gone — simpler invalidate.
- Toasts live in the mutation hook (`onSuccess`), not in the calling dialog. Uniform behaviour regardless of caller.

The class-store `OperatorTenantsStore` is gone. Components consume queries directly:

```svelte
<script lang="ts">
	import { tenantsListQuery, suspendTenantMutation } from '$features/operator/tenants/queries';

	let filters = $state({ q: '', status: 'active', cursor: null });
	const query = tenantsListQuery(filters);
	const suspend = suspendTenantMutation();
</script>

{#if $query.isLoading}
	<Spinner />
{:else if $query.isError}
	<Alert variant="danger">{$query.error.message}</Alert>
{:else}
	<ul>
		{#each $query.data.items as tenant (tenant.id)}
			<TenantRow {tenant} onSuspend={(reason) => $suspend.mutate({ id: tenant.id, reason })} />
		{/each}
	</ul>
{/if}
```

#### B.1.2 Error taxonomy in `lib/api/client.ts`

Replace the catch-all `Error` with a typed hierarchy. Components can pattern-match.

```ts
// lib/api/errors.ts
export class ApiError extends Error {
  constructor(public readonly traceId?: string) { super(); }
}

export class NetworkError extends ApiError {
  // socket hangup, offline, DNS fail, CORS
  constructor(public readonly cause: unknown) {
    super();
    this.message = 'Connection problem — check your network and try again.';
  }
  override readonly name = 'NetworkError';
}

export class TimeoutError extends ApiError {
  constructor() {
    super();
    this.message = 'Request timed out. The server may be slow — try again.';
  }
  override readonly name = 'TimeoutError';
}

export class ServerError extends ApiError {
  constructor(public readonly status: number, public readonly body: unknown, traceId?: string) {
    super(traceId);
    this.message = 'Server error — our team has been notified. Please try again.';
  }
  override readonly name = 'ServerError';
}

export class ValidationError extends ApiError {
  constructor(
    public readonly fields: Record<string, string>,
    public readonly status: number,
    traceId?: string
  ) {
    super(traceId);
    this.message = 'Validation failed';
  }
  override readonly name = 'ValidationError';
}

export class AuthError extends ApiError {
  constructor(public readonly status: 401 | 403, traceId?: string) {
    super(traceId);
    this.message = status === 401 ? 'Sign in to continue.' : 'You don't have permission for this action.';
  }
  override readonly name = 'AuthError';
}

export class NotFoundError extends ApiError {
  constructor(public readonly resource: string, traceId?: string) {
    super(traceId);
    this.message = `${resource} not found.`;
  }
  override readonly name = 'NotFoundError';
}
```

Update `client.ts` to throw the right subclass based on response status + parsed error body shape (see A.9 — once backend ships structured errors, `ValidationError.fields` is populated from `error.fields`).

Components surface specific messages:

```svelte
{#if $query.isError}
	{@const err = $query.error}
	{#if err instanceof NetworkError}
		<Alert variant="warning" title="Connection problem">
			We couldn't reach the server.
			<Button variant="ghost" onclick={() => $query.refetch()}>Retry</Button>
		</Alert>
	{:else if err instanceof AuthError && err.status === 403}
		<Alert variant="warning" title="Permission denied">{err.message}</Alert>
	{:else}
		<Alert variant="danger">{err.message}</Alert>
	{/if}
{/if}
```

#### B.1.3 URL state for filters / search / pagination

Lists encode their filter state in the URL so links are shareable and back-button works.

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	const filters = $derived({
		q: page.url.searchParams.get('q') ?? '',
		status: page.url.searchParams.get('status') ?? 'all',
		cursor: page.url.searchParams.get('cursor') ?? null
	});

	function updateFilter(key: string, value: string | null) {
		const url = new URL(page.url);
		if (value === null || value === '') url.searchParams.delete(key);
		else url.searchParams.set(key, value);
		// Pagination usually resets when other filters change
		if (key !== 'cursor') url.searchParams.delete('cursor');
		goto(url.toString(), { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>
```

#### B.1.4 Operator-scope routing — cookie-driven, slug-agnostic URL (revised 2026-05-21)

**Earlier draft proposed slug-in-URL (`/operator/tenants/acme-pharma/...`). Shipped implementation moved one step further: tenant identifier never appears in the browser URL at all.**

Routes:

```
/operator/tenants                              list page (no scope)
/operator/scope/profile                        active-tenant profile tab
/operator/scope/members                        active-tenant members tab
/operator/scope/roles                          active-tenant roles tab
/operator/scope/activity                       active-tenant audit log
/operator/scope/settings                       active-tenant lifecycle actions
```

How scope is entered: clicking a tenant row POSTs `{slug}` to `/api/operator/scope`. The SvelteKit BFF resolves slug → UUID via `GET /v1/tenants/by-slug/{slug}` (server-to-server), then stores `{id, slug, display_name}` in the `lk_op_tenant` httpOnly cookie. The client clears the TanStack cache, runs `invalidateAll()`, and navigates to `/operator/scope/profile`. The cookie is the single source of truth for active scope; the BFF auto-injects `X-Tenant-Id: <scope.id>` on every upstream Go call.

Exit: `DELETE /api/operator/scope` clears the cookie; client clears cache; navigates back to `/operator/tenants`.

Pattern reference: Stripe "Test Mode" toggle, Linear "Switch workspace", GitHub Enterprise "Switch enterprise" — all use server-side state, never URL state, for the acting-on context.

Why this is stronger than slug-in-URL:

- Tenant identifier never leaks via browser history, Referer headers, screen recordings, or shared links
- Server access logs no longer record per-tenant browsing patterns by an operator
- Browser DevTools Network tab still shows tenant UUIDs in `/api/v1/tenants/{id}/activity`-style paths; that is acceptable (DevTools is engineer-only) and a backend follow-up can migrate those to header-scoped paths (`/api/v1/activity` reading `X-Tenant-Id`)

Person routes stay UUID-only in URL today (e.g. `/operator/persons/{id}`). Same threat model as scope-cookie applies if/when the team decides person identifiers are sensitive — same pattern (cookie + scope routes) is the migration path. Out of scope for the tenant-context work shipped 2026-05-21.

Implementation reference: `docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md` § "Operator Scope Flow".

#### B.1.5 Nav rendering — tier-dispatched, no per-item permission filter (shipped 2026-05-21)

**Earlier draft proposed server-driven nav (backend ships a `data.nav` payload that the Sidebar renders verbatim). Shipped implementation went the opposite direction: nav is a static tier catalogue rendered synchronously from the SSR-bootstrapped capabilities.**

How it works:

```ts
// src/lib/config/nav.ts
export const PLATFORM_NAV: NavSection[] = [
	{ title: 'Operator', items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, ...] },
	...
];
export const TENANT_ADMIN_NAV: NavSection[] = [...];
export const TENANT_USER_NAV: NavSection[] = [...];

export function navForTier(tier: PrincipalTier): NavSection[] { ... }
```

```svelte
<!-- src/lib/layouts/Sidebar.svelte -->
const tier = $derived.by((): PrincipalTier => {
	const p = session.principal;        // derived from page.data.capabilities
	if (!p) return 'unknown';
	if (p.isPlatform && p.isSuperUser) return 'platform-super';
	...
});

const sections = $derived(navForTier(tier));
```

`page.data.capabilities` is baked into the first paint by `(app)/+layout.server.ts`. The Sidebar renders on the first frame — no skeleton, no async fallback, no nav pop-in.

**No per-item permission filtering.** Items in the tier catalogue are rendered as-is. The page each link goes to enforces fine-grained permissions at action time. This matches Stripe, AWS Console, GitHub, Linear, Vercel: nav is a stable shell, not a permission audit. Hiding nav links because the JWT didn't ship one specific perm produces broken UX ("I know the menu used to be here") that's worse than the user landing on a 403 page they can rationalise.

**Nav items must correspond to existing routes.** Roadmap destinations (Leads, Orders, Inventory, Dispatch) live in the roadmap doc, not in `nav.ts`. Dead links erode trust in the nav — they ship with their routes, never before.

Why this differs from the earlier server-driven-nav draft: backend `A.6 me-capabilities` shipped only the capability claims, not a nav-item list. The frontend chose to keep nav as a frontend concern — the backend has no business knowing about the UI's link structure, and tying nav to a backend payload meant every UI menu change required a backend deploy. The tier-catalogue approach localises nav drift to the frontend.

#### B.1.6 Toast system (transient feedback)

Stripe and Linear surface mutation success / failure via a toast that auto-dismisses (4-6s) and survives navigation. We don't have this primitive yet.

```svelte
<!-- lib/components/ui/Toaster.svelte -->
<script lang="ts" module>
	type Toast = { id: string; variant: 'success' | 'danger' | 'warning' | 'info'; message: string };
	const toasts = $state<Toast[]>([]);

	export function toast(variant: Toast['variant'], message: string) {
		const id = crypto.randomUUID();
		toasts.push({ id, variant, message });
		setTimeout(() => {
			const idx = toasts.findIndex((t) => t.id === id);
			if (idx >= 0) toasts.splice(idx, 1);
		}, 5000);
	}
</script>

<!-- mounted once in (app)/+layout.svelte -->
<div class="z-toast stack stack-tight fixed right-4 bottom-4">
	{#each toasts as t (t.id)}
		<div class="glass-card animate-slide-in-right px-4 py-3">{t.message}</div>
	{/each}
</div>
```

Used after successful mutations: `toast('success', 'Tenant suspended')`.

#### B.1.7 Cmd+K command palette (Linear / Vercel canon)

Single keyboard shortcut opens a typeahead that searches across resources (tenants, users, settings pages). Built on bits-ui Command primitive (or roll-our-own with the dropdown logic).

Out of v0.4 scope but design now so we don't paint ourselves into a corner.

---

### B.2 Per-surface redesign

For each, the goal: replace today's duct-tape with the canonical pattern. Auth hierarchy explicit. Page flow explicit.

#### B.2.1 Operator Dashboard — `/dashboard` for platform-super / platform-staff tiers

**Today:** Static placeholder widgets. Slice 5's fix wired five tiles to `/v1/platform/stats`.

**Canonical:** Stripe Dashboard / Linear pulse.

**Hierarchy:**

- platform-super sees all sections + impersonation indicator + global moderation queue
- platform-staff (Lead Agent, PlatformManager) sees marketplace + verification queues
- Both share the stats tiles

**Layout (top to bottom):**

```
┌────────────────────────────────────────────────────────────────┐
│ Operator Dashboard                       [⌘K]  [Bell]  [Avatar] │
├────────────────────────────────────────────────────────────────┤
│ Welcome back, Ada · 142 tenants under management                │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ Tenants  │ │ Active   │ │ Persons  │ │ Sessions │  ← stats   │
│ │   142    │ │   138    │ │   487    │ │   ↑34/w  │    tiles  │
│ │ +12 (w)  │ │ +11 (w)  │ │ +34 (w)  │ │          │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
├────────────────────────────────────────────────────────────────┤
│ Recent activity                  See all →                      │
│  • Ada suspended tenant acme-pharma — 12 min ago                │
│  • Bob ended impersonation of tenant beta-co — 1 h ago          │
│  • New tenant gamma-corp registered by Carol — 3 h ago          │
├────────────────────────────────────────────────────────────────┤
│ Quick actions                                                   │
│ [Register tenant]  [Find tenant]  [View moderation queue]       │
└────────────────────────────────────────────────────────────────┘
```

**Data flow:**

- Stats tiles → `platformStatsQuery()` with deltas (depends on backend A.4.1)
- Recent activity → `platformActivityQuery({ limit: 10 })` (depends on backend A.3 — global cross-resource activity feed)
- "See all →" navigates to `/operator/activity` (paginated full audit log)

**Without backend changes:** today's tiles work via `/v1/platform/stats`. The "Recent activity" section gets blocked until A.3 ships. Render a "Activity log shipping in v0.4.1" placeholder.

---

#### B.2.2 Tenant management — `/operator/tenants`

**Today:** Client-side filter on full-list fetch. Tenant detail at `/[id]` with UUID.

**Canonical:** Stripe Connect accounts list / Linear projects.

**Hierarchy:**

- platform-super sees all tenants + can perform any lifecycle action
- platform-staff (`platform.tenants.view` only) sees the list read-only; mutation buttons hidden
- tenant-admin / tenant-user never see this surface (their `/dashboard` redirects)

**URL structure (revised 2026-05-21):**

```
/operator/tenants                           list page
/operator/tenants?q=acme&status=active      list filtered (URL state — filter terms only, no identifiers)
/operator/tenants/new                       drawer for register (in-list slide-over)
/operator/scope/profile                     active-tenant profile tab
/operator/scope/members                     active-tenant members tab
/operator/scope/roles                       active-tenant roles tab
/operator/scope/activity                    active-tenant audit log
/operator/scope/settings                    active-tenant lifecycle actions
```

The tenant identifier (slug or UUID) does not appear in any URL above. The active-context is stored in the `lk_op_tenant` httpOnly cookie set by `POST /api/operator/scope`. See §B.1.4 for the full flow.

Rationale for hiding the slug too (not just the UUID):

- A slug like `acme-pharma` is a customer identity that should not leak through browser history, Referer headers to third-party assets, or shared URLs
- Server access logs no longer record which tenants an operator inspected
- Exit-scope semantics are explicit: an operator who clicks "Exit context" actually leaves the scope (cookie cleared) rather than just navigating away from a slug-URL while the next request silently still carried scope state

The trade-off accepted: URL-shareability inside operator scope is lost. Operators share data via the tenants list, not by sending `/operator/scope/...` links. This matches Stripe Test Mode, Linear workspace switcher, and GitHub Enterprise context switch — none of those expose deep-links into a switched context.

**List page layout:**

```
┌────────────────────────────────────────────────────────────────────┐
│ Tenants                                          [+ Register tenant]│
├────────────────────────────────────────────────────────────────────┤
│ [Search by name, slug, GST…  ⌘K-shortcut]    [Status ▼] [Sort ▼]    │
├────────────────────────────────────────────────────────────────────┤
│ Name              Slug            Status      Members   Created     │
├────────────────────────────────────────────────────────────────────┤
│ ⬢ Acme Pharma     acme-pharma     ● Active    24        2 weeks ago │
│ ⬢ Beta Co         beta-co         ● Active    8         1 month ago │
│ ⬢ Gamma Corp      gamma-corp      ⊘ Suspended 14        3 months    │
│ …                                                                   │
├────────────────────────────────────────────────────────────────────┤
│ Showing 1-20 of 142            [← Prev]  [1 2 3 …]  [Next →]        │
└────────────────────────────────────────────────────────────────────┘
```

Search is a debounced server-side query (300ms). Filters are URL-encoded. Pagination is cursor-based.

**Create flow:**

1. Click "Register tenant" → navigate to `/operator/tenants/new` (or open drawer — Linear/Vercel use a page; Stripe uses a slide-over)
2. Fill form (slug, legal name, display name, admin email, admin password, admin first/last name)
3. Submit → `POST /v1/tenants`
4. On 201: query cache invalidated; navigate immediately to `/operator/tenants/{new-slug}` (the detail page)
5. The detail page shows a banner at top: "Tenant created. Share the seed-admin credentials below — they're not retrievable." with the password + copy button. After dismissal, the banner doesn't show again (one-time view).

This replaces the current "stay in drawer, show credentials" flow. Stripe-canonical: redirect to detail.

**Detail page header:**

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Tenants                                                          │
│                                                                    │
│ Acme Pharma                                  ● Active              │
│ acme-pharma · GSTIN 27ABCDE1234F1Z5 · Created 2 weeks ago         │
│                                                                    │
│ [Open in tenant] [Impersonate] [Suspend ▾] [⋯ More]               │
├────────────────────────────────────────────────────────────────────┤
│ Profile  Members  Roles  Activity  Settings                        │
├────────────────────────────────────────────────────────────────────┤
│ <tab content>                                                      │
└────────────────────────────────────────────────────────────────────┘
```

Status badge uses Badge primitive. Tabs are URL-linked sub-routes (the WAI-ARIA Authoring approach). Actions in the header are immediate; destructive actions live behind the More menu.

**Action button gating:**

- "Impersonate" → only if `is_super_user` (or `platform.tenants.manage` if backend changes)
- "Suspend" → only if `platform.tenants.manage` AND tenant.status === 'active'
- "More" → contains Activate / Mark-for-deletion / Restore based on state

**Tabs:**

- **Profile** — read-only display of legal/display/contact/statutory/password-policy. Edit drawers per section (PATCH endpoints exist). On save: optimistic update; cache invalidates; toast.
- **Members** — paginated list of `UserDto` for this tenant (`GET /v1/users` but operator-scoped to the target tenant — needs a backend variant like `GET /v1/platform/tenants/{id}/members`).
- **Roles** — paginated list of `RoleDto` (similar — `GET /v1/platform/tenants/{id}/roles`).
- **Activity** — paginated audit log (depends on A.3.1).
- **Settings** — lifecycle action panel + slug-change form.

---

#### B.2.3 People management — `/operator/people`

**Today:** UUID-only lookup + banner.

**Canonical:** Auth0 Users page / GitHub org members.

**Hierarchy:**

- platform-super sees all persons + can globally suspend + anonymise
- platform-staff (`platform.users.view` only) sees the list read-only

**URL structure:**

```
/operator/people                            list page
/operator/people?q=ada@&status=active       filtered list
/operator/people/[id]                       detail (UUID-keyed — no slug for persons)
/operator/people/[id]/profile               default tab
/operator/people/[id]/memberships           cross-tenant memberships
/operator/people/[id]/activity              audit log
/operator/people/[id]/dpdp                  anonymisation flow (separate page, high-friction)
```

**List page:** same layout as tenants but column set:

```
Email                First name  Last name  Status   Tenants  Joined
```

Search by email / first / last name. Filter by status (active / suspended / anonymised). Once backend ships A.2.2.

**Detail page header:**

```
┌────────────────────────────────────────────────────────────────────┐
│ ← People                                                           │
│                                                                    │
│ Ada Lovelace                              ● Active                 │
│ ada@example.com · 3 active memberships · Joined 2 years ago       │
│                                                                    │
│ [Suspend globally] [⋯ More]                                       │
├────────────────────────────────────────────────────────────────────┤
│ Profile  Memberships  Activity  DPDP                               │
└────────────────────────────────────────────────────────────────────┘
```

**Memberships tab:** Table of `UserDto[]` from `GET /v1/platform/persons/{id}/memberships`. Each row shows tenant display_name (clickable → tenant detail), designation, status, role chips.

**DPDP tab:** dedicated route for the anonymisation flow — separate from the regular action menu to prevent accidental clicks. Two-step typed-email confirmation lives here. Once submitted, the person can't be un-anonymised — the page state shows "Anonymisation in progress" then a final "Anonymised on {date}" with no further actions.

---

#### B.2.4 Tenant user management — `/settings/users`

**Today:** Functional. Adapt to canonical patterns.

**Hierarchy:**

- tenant-admin sees full list + create / deactivate / role / manager / permission actions
- tenant-user never sees this surface

**URL structure:**

```
/settings/users
/settings/users?q=&status=&role_id=
/settings/users/new                    page-or-drawer for invite
/settings/users/[id]                   detail (UUID-keyed)
/settings/users/[id]/profile           (default tab)
/settings/users/[id]/roles             roles tab
/settings/users/[id]/permissions       permission overrides tab
/settings/users/[id]/activity          activity tab
```

Each role/manager/permission flow becomes a tab on the detail page rather than a separate drawer-from-the-list. This is GitHub / Auth0 canon — "open the user, then act on them" — and aligns with deep-linking ("send this user's profile to my colleague").

The drawers from the list page stay for the CREATE flow only. All other mutations live on the detail page.

---

#### B.2.5 Roles management — `/settings/roles`

**Today:** Functional. Adapt to canonical patterns.

**Hierarchy:**

- tenant-admin reads, creates, edits non-protected roles
- protected roles (system-default, SuperAdmin) render read-only

**URL structure:**

```
/settings/roles
/settings/roles?q=
/settings/roles/new                    create page
/settings/roles/[id]                   detail
/settings/roles/[id]/permissions       permission editor (default tab)
/settings/roles/[id]/members           members assigned this role
/settings/roles/[id]/activity          audit log for the role
```

Permission editor stays as PermissionTree but adapts to render the BACKEND-supplied catalogue once `GET /v1/permissions` ships. Until then it uses the hardcoded mirror.

---

#### B.2.6 Account self-service — `/settings/account`

**Today:** Already in slice 1 — good shape.

**Canonical adjustments:**

- Add `/settings/account/activity` tab showing the caller's audit log (depends on A.3.3)
- Add `/settings/account/security` tab subsections for: password change (existing), MFA (post-launch), trusted devices (= sessions, existing)
- `/settings/account/notifications` tab for email + in-app preferences (depends on a notifications-prefs backend endpoint — separate slice)

Tier hierarchy: every signed-in user, scoped to their own membership.

---

#### B.2.7 Impersonation flow

**Today:** Modal + banner; audit-only.

**Canonical (Stripe Connect / AWS AssumeRole) — depends on A.10:**

1. Operator clicks "Impersonate" on a tenant detail page or row
2. Modal: reason capture (≥10 chars), duration picker (preset 15min / 30min / 1h / 2h)
3. Submit → backend issues a scoped JWT (A.10) + records the audit session
4. Frontend stores the scoped JWT, updates the auth store, **redirects to the tenant's `/dashboard`** — now viewing AS the seed admin
5. Persistent banner at top of every page: "Impersonating Acme Pharma · Reason: ... · Expires in 29:42 · [End impersonation]"
6. Countdown ticks. At 1 min remaining, banner turns warning. At expiry: banner clears, original auth restored.
7. End impersonation → revoke scoped JWT + redirect back to `/operator/tenants/{slug}`

Without A.10, today's "audit-only" flow is honest and shippable — but it's a recording layer, not a "view-as" mode. Don't pretend otherwise in the UI copy.

---

### B.3 Auth hierarchy summary table

| Tier                | Routes visible                                                                                                                                  | Key permissions                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **unauthenticated** | `/signin`                                                                                                                                       | none                                                                                           |
| **tenant-user**     | `/dashboard` `/leads` `/tasks` `/notifications` `/settings/account/*`                                                                           | none specific (own data only)                                                                  |
| **tenant-admin**    | + `/settings/tenant/*` `/settings/users/*` `/settings/roles/*`                                                                                  | `tenant.admin`, `identity.users.*`, `identity.roles.*`                                         |
| **platform-staff**  | `/dashboard (operator variant)` `/operator/tenants` (read) `/operator/people` (read) `/platform/leads` `/platform/verify` `/settings/account/*` | `platform.tenants.view` `platform.users.view` (+ marketplace perms)                            |
| **platform-super**  | All of the above + lifecycle actions + `/operator/impersonate`                                                                                  | + `platform.tenants.manage` `platform.users.manage` `identity.users.anonymise` `is_super_user` |

Tier is derived in `tier.ts` from JWT claims (`is_platform`, `is_super_user`, `permissions[]`) — unchanged. The auth GUARD lives in `+page.ts` `load` functions per route — unchanged. What CHANGES: server-driven capability list (A.6) becomes the source of truth, with `tier.ts` as a fallback while backend rolls out.

---

### B.4 Migration plan from today's code to v2

**Phase 1 — Frontend-only (no backend dependency, ~2-3 days):**

1. Install `@tanstack/svelte-query`, mount `QueryClientProvider` in `(app)/+layout.svelte`
2. Build the error taxonomy in `lib/api/errors.ts` + update `client.ts` to throw subclasses
3. Build the `Toaster` primitive
4. Add URL-state filter helpers
5. Migrate ONE surface (operator/tenants list) end-to-end to TanStack Query as a pattern reference
6. Document the pattern in `docs/superpowers/specs/operator-surface-v2-canon.md` (this file) and `CLAUDE.md`

**Phase 2 — Migrate remaining surfaces to query library (1-2 days each):**

7. operator/tenants detail
8. operator/people
9. settings/users
10. settings/roles
11. settings/account
12. operator/dashboard (with stats tile deltas — placeholder until backend ships)

**Phase 3 — Backend-dependent features (gated on each endpoint shipping):**

13. Slug-based tenant routes (A.1.1)
14. Server-side search on lists (A.2)
15. Audit log tabs on detail pages (A.3)
16. Activity feed on operator dashboard (A.3 global)
17. Stats deltas on dashboard tiles (A.4.1)
18. Structured field-errors → per-field error rendering in forms (A.9)
19. Mutation responses → drop the follow-up GET on detail-after-mutate (A.8)
20. Capability-driven nav (A.6)
21. View-as impersonation with scoped JWT (A.10)

---

## PART C — What I'll do next on the frontend

Without waiting for backend, the frontend work I can land now:

1. Install `@tanstack/svelte-query` + mount provider
2. Build `lib/api/errors.ts` taxonomy + update `client.ts`
3. Build `Toaster` primitive
4. Migrate `/operator/tenants` list page to the query library as a pattern reference
5. Document the pattern in this spec + add a "How to add a new resource surface" recipe to `CLAUDE.md`

Then per surface, mechanical refactor. Each surface is ~1 day.

Backend-blocked work (slug routes, server-side search, audit log, deltas, structured errors, view-as impersonation) waits on the wishlist above.

Want me to start the Phase 1 frontend infrastructure work now? Or hand the backend wishlist to leadkart-go first and ramp up frontend Phase 1 in parallel?
