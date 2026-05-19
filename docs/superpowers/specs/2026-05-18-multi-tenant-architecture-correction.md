# Multi-tenant architecture — correction to operator surface design

**Date:** 2026-05-18
**Status:** Architecture correction. Supersedes parts of `2026-05-18-operator-surface-v2-canon.md` §B.2.3 (PeopleList) and §B.2.2 (Members tab on tenant detail).

---

## TL;DR

The current `/operator/people` page as a sibling of `/operator/tenants` is wrong for a multi-tenant SaaS. **People are reached VIA tenants**, not as a global resource at the navigation root. Every FAANG-canon multi-tenant admin surface scopes user management to an active tenant context. The frontend missed this. This doc corrects the model.

---

## Deep-level canonical pattern audit

### Stripe Connect (the closest analog — platform/marketplace + tenant accounts)

- Top-left: "Acting as: <connected account name>" chip when inside an account
- All navigation under that chip is **per-account scoped**: Customers, Payments, Disputes, Members, Settings — every list endpoint passes the connected account ID
- "Connect home" is the cross-account dashboard with stats + recent activity. From there, operator drills into a specific account, then operates IN that scope.
- There is **no global "all customers across all accounts" page**. Customers live within an account. Search-across-accounts is a Connect-platform feature gated behind a specific permission, not the default.
- Source: Stripe Connect dashboard, Stripe support tooling internals

### AWS Organizations + IAM Identity Center

- Management account console = the operator's home
- Switch-Role into a member account = enter that account's context
- IAM users are listed PER-account (each account has its own user table)
- IAM Identity Center adds a CENTRAL user pool, but assignments happen explicitly per-account
- No "all IAM users across all accounts" global list — that would be a security failure
- Source: AWS console UX, AWS Well-Architected multi-account guide

### Auth0 Management Dashboard

- Each Auth0 customer has one or more **Tenants** (Auth0's term)
- Tenant picker at the top of the Management Dashboard
- Users list scopes to the active tenant
- Cross-tenant work requires an explicit tenant switch
- A "Master Tenant" exists for Auth0 internal use; even there, user management is per-tenant
- Source: Auth0 Management Console, Auth0 Multi-Tenancy guide

### Vercel (team + project model)

- Team switcher in the top-left
- Members are listed per-team
- Personal projects vs team projects are explicit scopes
- No global "all members across all teams" page
- Source: Vercel dashboard

### GitHub Enterprise Cloud

- Enterprise > Organizations > Repos/Teams/Members hierarchy
- Org members are listed per-org
- Enterprise admins can see "People" aggregated across orgs **but** only for billing / license accounting — the actions (add/remove/role-change) require entering an org first
- Source: GitHub Enterprise admin docs

### Microsoft Entra ID (Azure AD)

- Each Entra tenant is a directory
- "Switch directory" link in the top-right
- Users list is per-directory
- B2B guests are explicit per-directory invitations
- A user can exist in multiple directories — the global User Profile is separate from per-directory presence
- Source: Microsoft Entra ID admin center

### Salesforce Multi-Org

- Org switcher dropdown at top
- All record types (Users, Accounts, Contacts) are per-org
- Cross-org reports require explicit federation setup
- Source: Salesforce Lightning admin console

### Notion / Slack workspaces

- Workspace switcher top-left
- Members list per-workspace
- Same identity can be a member of many workspaces but each membership is independent
- Source: Notion admin, Slack admin

### Atlassian (Jira / Confluence)

- Site (= tenant) switcher
- Users list per site
- Atlassian Access (the enterprise SSO product) centralizes identity but per-site membership stays explicit
- Source: Atlassian admin

### Convergent pattern (8 of 8 FAANG-tier examples)

1. **Tenant context is an explicit object in chrome** (chip, dropdown, switcher) showing which tenant the operator is acting on
2. **All resource navigation is scoped to the active tenant** by default
3. **Member / user lists belong INSIDE a tenant scope**, never as a global root-level page
4. **Cross-tenant aggregations exist** (billing rollups, security overviews) but are special "central" surfaces, not the default user-management entrypoint
5. **The URL carries the tenant identifier** below the operator root: `/operator/tenants/{slug}/...`
6. **Switching tenant context updates the URL** and reloads the scoped data
7. **Global identity exists separately from per-tenant membership** — but operators normally REACH a person via a tenant context, not via a global registry
8. **Impersonation = entering a tenant's context as one of its users** — the entire UI rebrands to reflect the new scope

---

## How LeadKart's data model maps to the canon

The backend already follows the canonical Person + Membership split — this is correct and matches Auth0 / Entra ID / GitHub.

```
Person (global)
   ↕  has many
TenantMembership (one Person can be member of N tenants over time;
                 at most 1 ACTIVE membership at any moment per BRD §3)
   ↕  belongs to
Tenant
```

So a "user" in any operator context is really a `TenantMembership` — a Person scoped to a specific Tenant. The Person identity is a separate global object reached from a Membership.

**Where the frontend went wrong:**

- `/operator/people` treats Person as a top-level resource → reachable without tenant context
- This breaks the canon because operators expect to think in tenant terms ("show me Acme's members")
- It also makes the search-by-UUID problem unsolvable — there's no obvious search key for Persons outside a tenant context (email is one option but emails reuse across deactivated identities)

---

## Corrected operator surface architecture

### Routing tree (canon-aligned)

```
/operator                                          operator home / dashboard
    │  cross-tenant stats, activity feed, quick-find-tenant
    │
    /tenants                                       tenants list (cross-tenant)
        │
        /new                                       register a tenant
        │
        /{slug}                                    ENTER TENANT CONTEXT (slug-keyed)
            │
            /profile                              profile + statutory + contact + display preferences
            /members                              members LIST (canonical "users" page)
                │
                /{membership_id}                  member detail (per-tenant scope)
                    │
                    /profile                      designation/department/status_message
                    /roles                        assigned roles + assignment drawer
                    /permissions                  permission overrides
                    /activity                     audit log for this membership
                    /global                       deep-link → /operator/persons/{person_id}
            /roles                                tenant's roles
                /{role_id}                        role detail + permission editor
            /activity                             tenant-level audit log
            /settings                             lifecycle actions (suspend / mark / restore)
            /impersonate                          start impersonation (action page)
    │
    /persons/{person_id}                          GLOBAL identity view — deep-link target
        │  Reached from a member's /global link OR from search dropdown.
        │  NOT in the sidebar nav. Shows cross-tenant memberships, DPDP actions.
        │
        /activity                                 cross-tenant person-scope activity
        /dpdp                                     anonymisation flow
    │
    /search                                       global search results page (Cmd+K backed)
```

### Why this works

- **Tenants are the root operator concept.** The sidebar shows tenants. Everything else is reached through them.
- **Members list lives under tenant.** No more standalone "Platform users" nav entry — that was the architectural error.
- **Person registry is a deep-link surface**, never sidebar. Reached from a member's "Global identity" link or from a Cmd+K search result. This matches Entra ID's separation of "User in Directory" vs "Global User Profile".
- **URL always carries the tenant slug** when the operator is inside a tenant context, so back/forward/share-link work and there's no ambient hidden state.
- **DPDP anonymisation is a HIGH-FRICTION dedicated route** (`/persons/{id}/dpdp`) — not buried in a row-action menu. Auth0's "Delete user" + Entra ID's "Permanently delete" both isolate destructive identity ops to a dedicated page.

### Sidebar nav (operator tier)

```
┌────────────────────────────┐
│ ⬢ LeadKart                 │
├────────────────────────────┤
│ ── Operator                │
│  ▢ Dashboard                │
│  ▢ Tenants                  │
│  ▢ Activity                 │  ← global cross-tenant activity feed
│  ▢ Stats / Insights         │
├────────────────────────────┤
│ ── Account                  │
│  ▢ Your account             │
└────────────────────────────┘
```

When the operator enters a tenant context (`/operator/tenants/acme-pharma`), the sidebar **expands a contextual second tier** showing the tenant's sub-pages:

```
┌────────────────────────────┐
│ ⬢ LeadKart                 │
├────────────────────────────┤
│ ── Operator                │
│  ▢ Dashboard                │
│  ▢ Tenants                  │
│  ▢ Activity                 │
│  ▢ Stats                    │
├────────────────────────────┤
│ ── ⬡ Acme Pharma (active)  │  ← tenant context chip
│  ▢ Profile                  │
│  ▢ Members                  │
│  ▢ Roles                    │
│  ▢ Activity                 │
│  ▢ Settings                 │
│  [Exit tenant context]      │
├────────────────────────────┤
│ ── Account                  │
│  ▢ Your account             │
└────────────────────────────┘
```

This is the Stripe Connect / Vercel / Notion canon for context-aware sidebars.

### Topbar chip when inside a tenant context

```
[⬢ LK]    Operator › Acme Pharma ▾    [search ⌘K]    [⚙]  [bell]  [avatar]
```

Clicking the breadcrumb-style chip opens a tenant picker (Cmd+K filtered to tenants). Selecting a tenant updates the URL to that tenant's root. This is Vercel's team-switcher pattern.

### Tenant-admin tier — no switcher needed

Tenant admins are IMPLICITLY in their own tenant (the JWT pins them). The sidebar shows tenant sub-pages directly without operator chrome:

```
┌────────────────────────────┐
│ ⬢ LeadKart                 │
├────────────────────────────┤
│  ▢ Dashboard                │
├────────────────────────────┤
│ ── Operations               │
│  ▢ Leads                    │
│  ▢ Orders                   │
│  ▢ Inventory                │
│  ▢ Dispatch                 │
├────────────────────────────┤
│ ── Administration           │
│  ▢ Tenant Settings          │
│  ▢ Team (Members)           │  ← was /settings/users; tenant-implicit
│  ▢ Roles                    │
├────────────────────────────┤
│ ── Account                  │
│  ▢ Your account             │
└────────────────────────────┘
```

Tenant-admin URLs stay short — `/settings/users` not `/operator/tenants/.../members` — because the tenant is implicit from the JWT. Same backend endpoint, different URL because the path encodes the **context source** (operator-chosen vs JWT-implicit).

### Impersonation as context entry

This is the bit that ties everything together. Impersonation isn't a separate concept from tenant-context — it's the strongest form of it.

Today's impersonation is audit-only (records intent + reason). Per the v2 spec A.10, the canonical pattern is:

1. Operator clicks "Impersonate" on `/operator/tenants/acme-pharma`
2. Modal: reason (≥10 chars), duration picker
3. Submit → backend issues a **scoped JWT** that grants the operator the seed-admin's tenant permissions for the duration
4. Frontend stores the scoped JWT, **the entire UI rebrands to TENANT-ADMIN tier** (sidebar swaps to the tenant nav, no more operator chrome)
5. Persistent banner across the top: "Impersonating Acme Pharma · Reason · 29:42 remaining · End impersonation"
6. All API calls now use the scoped JWT; data is naturally tenant-scoped
7. End impersonation → revoke scoped JWT, restore original auth, URL returns to `/operator/tenants/acme-pharma`

This matches Stripe Connect "View as account", AWS AssumeRole, Auth0 "Impersonate user", Entra ID "Sign in as user" — all eight references.

---

## Concrete deltas vs the previous design

### Routes — drop these

- `/operator/people` (top-level — incorrect)
- `/operator/people/[id]` (top-level — replaced by `/operator/persons/[id]` as DEEP-LINK only)

### Routes — add these

- `/operator/tenants/[slug]/members` (NEW — replaces `/operator/people` for the day-to-day op)
- `/operator/tenants/[slug]/members/[membership_id]` (NEW — was `/settings/users/[id]` in tenant-admin tier; cross-tenant access via operator route)
- `/operator/tenants/[slug]/members/[membership_id]/global` (NEW — link target, redirects to global person view)
- `/operator/tenants/[slug]/roles` (NEW — operator-viewing of tenant roles, mostly read-only)
- `/operator/tenants/[slug]/activity` (NEW — depends on backend A.3.1)
- `/operator/tenants/[slug]/impersonate` (NEW — replaces inline impersonation modal — separate route emphasizes the gravity of the action)
- `/operator/persons/[person_id]` (RENAMED from `/operator/people/[id]` — kept as deep-link only, not in sidebar)
- `/operator/persons/[person_id]/dpdp` (NEW — dedicated anonymisation route, high-friction)

### Sidebar config — operator tier

Remove `/operator/people` entry. Replace with:

```ts
PLATFORM_NAV = [
	{
		items: [{ href: '/operator', label: 'Dashboard', icon: LayoutDashboard, requires: null }]
	},
	{
		title: 'Cross-tenant',
		items: [
			{
				href: '/operator/tenants',
				label: 'Tenants',
				icon: Building2,
				requires: 'platform.tenants.view'
			},
			{
				href: '/operator/activity',
				label: 'Activity',
				icon: Activity,
				requires: 'platform.tenants.view'
			},
			{
				href: '/operator/insights',
				label: 'Insights',
				icon: BarChart3,
				requires: 'platform.tenants.view'
			}
		]
	},
	// Tenant-context section is RENDERED DYNAMICALLY when route matches /operator/tenants/[slug]/...
	{
		title: 'Account',
		items: [{ href: '/settings/account', label: 'Your account', icon: ShieldCheck, requires: null }]
	}
];
```

The tenant-context section is rendered by the `Sidebar.svelte` component reading `page.params.slug` — if present + matches a known tenant, it appends a context section to the rendered nav.

### Topbar context chip

New component `lib/layouts/TenantContextChip.svelte`. Renders only when operator is inside a tenant scope. Clickable → opens Cmd+K-style picker. Shows tenant display_name + "Exit" button.

### Auth tier hierarchy (revised)

| Tier                               | Default route                   | Tenant context                | Sidebar                    |
| ---------------------------------- | ------------------------------- | ----------------------------- | -------------------------- |
| **unauth**                         | `/signin`                       | n/a                           | none                       |
| **tenant-user**                    | `/dashboard`                    | implicit from JWT             | personal workspace nav     |
| **tenant-admin**                   | `/dashboard`                    | implicit from JWT             | + administration           |
| **platform-staff**                 | `/operator`                     | none (or picked via switcher) | operator nav               |
| **platform-super**                 | `/operator`                     | none (default) — pickable     | + impersonation + dpdp     |
| **platform-super (impersonating)** | `/dashboard` (in target tenant) | from scoped JWT               | tenant-admin nav of target |

---

## What was right vs what was wrong

**Right (keep as-is):**

- Slice 1 (Account self-service) — unchanged. Personal scope, always tenant-implicit.
- Slice 2 (Tenant user management at `/settings/users`) — unchanged. Tenant-admin tier, tenant-implicit.
- Slice 3 (Tenant roles at `/settings/roles`) — unchanged. Same.
- Slice 4 (Operator tenant management at `/operator/tenants`) — unchanged. **This is the correct entrypoint.**

**Wrong (refactor):**

- Slice 5 (Operator people management at `/operator/people`) — top-level placement was wrong. Move to:
  - Tenant-scoped members access via `/operator/tenants/[slug]/members` (mirrors the tenant-admin's `/settings/users` but in operator chrome)
  - Person registry access via `/operator/persons/[person_id]` as a DEEP-LINK ONLY (not in nav). Reached from member detail's "Global identity" link.

**Wrong (refactor):**

- Slice 6 (Operator impersonation) — current implementation is audit-only with a sticky banner. Canonical is AssumeRole-style context entry where the entire UI rebrands. This is **backend-blocked on A.10** (scoped JWT issuance). The current implementation is honest about being audit-only; canonical work waits for A.10.

---

## Migration plan

### Phase A — Frontend route restructure (no backend dependency, ~1 day)

1. Move `/operator/people` → `/operator/persons` (rename root segment to singular "persons", emphasize "global identity registry")
2. Remove the Persons entry from `PLATFORM_NAV` sidebar — make it deep-link only
3. Add `/operator/tenants/[slug]/members` route + page that reuses the existing UsersList component but with the operator's tenant-scoped GET (depends on A.2.3 query support for impersonation context OR a `?tenant_id=` operator override on the existing endpoint)
4. Add tenant-context section to Sidebar.svelte that activates on tenant-detail routes
5. Add TenantContextChip.svelte in topbar — renders when in tenant scope

### Phase B — Backend dependencies (queued in canon spec PART A)

6. A.1.1 slug routing
7. A.2 server-side search + pagination
8. A.10 scoped JWT for impersonation
9. A.3 activity endpoints

### Phase C — Polish

10. Cmd+K palette spanning tenants + members + roles + settings
11. Cross-tenant person search (depends on A.2.2)
12. Live activity feed on `/operator` dashboard

---

## Open questions for backend

1. **`?tenant_id=` override on existing tenant-scoped endpoints**, OR a parallel `/v1/platform/tenants/{id}/users` family? Both work; pick one. Stripe uses `?account=acct_xxx` as a parameter; AWS uses `--account` flag; Auth0 uses tenant-prefixed URLs.

2. **Scoped JWT during impersonation** (A.10) — exact claim shape? Suggest:

   ```
   sub: <operator-person-id>            (original)
   tenant_id: <target-tenant-id>        (impersonated)
   membership_id: <target-membership-id> (seed admin or designated)
   impersonator_id: <operator-person-id> (forensic anchor)
   impersonation_session_id: <session-id>
   exp: <issued + duration>
   ```

   `sub` stays operator (so audit trail anchors to the operator who started it); `tenant_id` and `membership_id` reflect the impersonation target. `impersonator_id` makes it crystal-clear in the JWT payload that this is a delegated session.

3. **DPDP anonymisation visibility** — once anonymised, can the person still be VIEWED at `/operator/persons/{id}` for audit purposes (showing redacted fields + the original anonymisation reason + actor)? Suggest yes — audit visibility is the point. Action menu shows "Anonymised on {date} by {operator}" with no further actions available.

---

## Summary

The current `/operator/people` page is the only architectural error. Tenant-management at `/operator/tenants` is correct as an operator-tier root. The fix is:

- **Drop "Platform users" from sidebar** — it doesn't exist in any FAANG-tier multi-tenant admin product as a top-level surface
- **Add "Members" sub-route under each tenant** at `/operator/tenants/[slug]/members` — that's how operators canonically work with users
- **Keep `/operator/persons/[id]` as a deep-link target** for the rare cross-tenant view (DPDP, audit) — never in sidebar
- **Sidebar grows a tenant-context section** when the operator is inside a tenant
- **Topbar shows the active tenant chip** for ambient context awareness
- **Impersonation enters the tenant context fully** once A.10 ships — until then today's audit-only flow stays
