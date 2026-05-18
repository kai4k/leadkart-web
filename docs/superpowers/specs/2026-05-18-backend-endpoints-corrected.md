# Backend endpoint design — corrected for LeadKart-as-tenant

**Date:** 2026-05-18
**Status:** Supersedes the wishlist in `2026-05-18-operator-surface-v2-canon.md` Part A. Reflects the architecture correction in `2026-05-18-multi-tenant-architecture-correction.md` (LeadKart is the platform tenant with slug `"platform"` — confirmed in backend).

---

## Guiding principle

LeadKart's platform team is **just another tenant** (slug `"platform"`, special backend guards already in place). Every operation an operator performs on a tenant — including the platform tenant itself — uses the **same endpoint set** as the tenant-admin uses on their own tenant.

The only DISTINCT operator surface area is:

1. Cross-tenant **discovery** (list all tenants, find a person across tenants, dashboard stats)
2. Cross-tenant **mutation** (DPDP anonymisation that spans memberships)
3. **Impersonation sessions** (the audit + scoped-JWT layer)

Everything else is the tenant-scoped endpoint with the operator's JWT carrying `is_platform=true` (which bypasses RLS) and an explicit `tenant_id` scope.

---

## Tenant scope — how the operator picks a tenant

Three mechanisms, in order of friction:

### 1. JWT `tenant_id` claim — implicit scope

- Tenant-admin / tenant-user: JWT pins to their own tenant
- Operator at rest: JWT pins to the platform tenant
- Backend reads `tenant_id` from JWT and applies RLS

This is what exists today. No change.

### 2. `?tenant_id=` query parameter — read-side override

For **read-only operator queries** on another tenant:

```
GET /api/v1/users?tenant_id={target-tenant-uuid-or-slug}
   → If JWT has is_platform=true: server overrides RLS scope to target tenant.
   → If JWT lacks is_platform=true: 403.
```

Concrete addition: every tenant-scoped GET should accept an optional `?tenant_id=` override that:

- Is silently ignored when JWT.is_platform = false (server scopes to JWT.tenant_id as today)
- Is honored when JWT.is_platform = true (server overrides RLS to the target)
- Accepts UUID OR slug — backend resolves slug → UUID

**No new endpoints.** Just an extension to existing query parameters.

### 3. Scoped-JWT impersonation — write-side scope

For **mutations** on another tenant, the operator must START AN IMPERSONATION SESSION:

```
POST /api/v1/platform/impersonation/sessions
  body: { target_tenant_id, reason (>=10 chars), duration_minutes }
  → 201 { session_id, expires_at_utc,
          access_token (scoped JWT),
          refresh_token (scoped) }
```

The scoped JWT has:

```
sub: <operator-person-id>            // forensic anchor — never changes
tenant_id: <target-tenant-id>        // impersonated scope
membership_id: <synthesized or target-seed-admin's>
is_platform: false                   // explicitly demote during impersonation
is_super_user: false                 // demote
permissions: <effective permissions from target's CompanyOwner role>
impersonator_id: <operator-person-id>
impersonator_membership_id: <operator's platform membership>
impersonation_session_id: <session-id>
exp: <duration-minutes from issuance>
```

The frontend swaps the access/refresh-token pair on impersonation start. All subsequent API calls naturally scope to the target tenant. End impersonation → DELETE session → revoke scoped JWT → frontend restores original token pair.

**Pattern source:** AWS STS AssumeRole returns temporary credentials; Auth0's "Impersonate" likewise; Stripe Connect's `Account-Override-Token`. All three converge.

---

## A. Existing endpoints — extensions

For each existing endpoint, what changes:

### A.1 Authorization expansions (no path change)

All these accept `?tenant_id=` (UUID or slug) as a read-side scope override when JWT.is_platform=true:

```
GET    /api/v1/users[?tenant_id=]                      list members of any tenant
GET    /api/v1/users/{id}[?tenant_id=]                 read member (id is membership_id; tenant_id disambiguates)
GET    /api/v1/roles[?tenant_id=]                      list roles of any tenant
GET    /api/v1/roles/{id}[?tenant_id=]                 read role
GET    /api/v1/tenants/{id-or-slug}                    read tenant by UUID or slug    ← see A.4
```

### A.2 Cursor pagination + search on lists

Same request shape on every list endpoint:

```
?q=<term>&cursor=<opaque>&limit=20&sort=<field>&order=asc|desc&<filter>=<value>

response:
{
  "items": [/* ResourceDto */],
  "next_cursor": "opaque-string" | null
}
```

Apply to:

```
GET /api/v1/tenants                          q searches: display_name, legal_name, slug, gst_number, pan_number
                                              filters: status, is_platform_tenant (special hint for the platform tenant)
                                              sort: created_at, display_name, status, activated_at
GET /api/v1/users[?tenant_id=]                q searches: email, first_name, last_name, designation, department
                                              filters: status, role_id
                                              sort: joined_at, email, status
GET /api/v1/roles[?tenant_id=]                q searches: name
                                              sort: hierarchy_level, name, created_at
```

The previous `GET /v1/platform/tenants` becomes simply `GET /api/v1/tenants` with the operator's JWT — the `is_platform=true` claim grants visibility across tenants. **Drop the `/platform/tenants` path** — it's redundant once the regular endpoint respects platform-bypass.

### A.3 Tenant lookup by slug (existing endpoint, overload key)

```
GET /api/v1/tenants/{key}
```

`{key}` matches UUID regex → UUID lookup; otherwise → slug lookup. Backend does the discriminator. Single endpoint, two key formats.

Frontend uses slug in URLs always (`/operator/tenants/acme-pharma`); UUID only in deep-link JWT references.

### A.4 Mutation responses return the resource

Today most mutations return 204. Canonical: return the updated DTO so the frontend doesn't need a follow-up GET.

```
PATCH /api/v1/tenants/{id}/profile        → 200 TenantDto
PATCH /api/v1/users/{id}/profile          → 200 UserDto
POST  /api/v1/users/{id}/deactivate       → 200 UserDto (status flipped to inactive)
POST  /api/v1/users/{id}/reactivate       → 200 UserDto
POST  /api/v1/users/{id}/roles            → 200 UserDto (role_ids updated)
PATCH /api/v1/users/{id}/permission-overrides → 200 UserDto
POST  /api/v1/roles/{id}/permissions/grant → 200 RoleDto
... (everything that mutates)
```

Saves a network round-trip per mutation. Stripe / GitHub / Auth0 canon.

### A.5 Structured error responses

Existing `{ code, message }` extended to include field-level errors + retry hint + trace ID:

```json
{
	"error": {
		"code": "validation_failed",
		"message": "Request validation failed",
		"fields": {
			"email": "must be a valid email address",
			"admin_password": "must be at least 8 characters"
		},
		"trace_id": "req_a3f5d8e2",
		"retryable": false
	}
}
```

`fields` is optional — only present on 422 / 400. Other status codes carry `code` + `message` + `trace_id` + `retryable`. Per Stripe / Twilio / Auth0.

---

## B. New endpoints

### B.1 Capability discovery

```
GET /api/v1/auth/me/capabilities
auth + any signed-in user
→ {
    tier: "platform-super" | "platform-staff" | "tenant-admin" | "tenant-user",
    tenant_id: "<active tenant uuid>",
    tenant_slug: "<active tenant slug>",
    is_platform: bool,
    is_super_user: bool,
    permissions: ["identity.users.view", ...],
    features: ["impersonation.enabled", "operator.dpdp.enabled", ...],
    nav_hints: {
      sections: ["operator", "tenant-admin", "personal"]
    }
  }
```

Frontend reads this once per session (`@tanstack/svelte-query` with 5min stale time + refetch on focus). Drives sidebar nav, route guards, button visibility. Replaces the brittle frontend permission-matrix in `tier.ts` + `nav.ts`.

**Where the capabilities source from:** the same logic the server already uses to mint JWT claims at login. Surface it as a read endpoint.

### B.2 Audit log read endpoints

```
GET /api/v1/tenants/{id}/activity[?tenant_id=]        tenant-scoped audit log
GET /api/v1/auth/me/activity                          caller's own audit log
GET /api/v1/users/{id}/activity[?tenant_id=]          one member's audit log
GET /api/v1/persons/{id}/activity                     one person's cross-tenant audit log (operator-scope)

All paginated with cursor + filters:
?cursor=&limit=&since=&until=&actor_id=&event_type=

ActivityDto: {
  id, event_type, actor_id (membership_id),
  actor_display_name, target_id, target_type,
  tenant_id, payload (jsonb), occurred_at, trace_id
}
```

The outbox table already records these events. Surface them via a read endpoint per resource (tenant / membership / person / self).

### B.3 Person registry — deep-link surface

Persons are **NOT** a listed top-level resource. There is no `GET /api/v1/platform/persons` list — that conflates global identity with tenant membership, breaking the canonical model.

Person endpoints exist as DEEP-LINK targets reached from a Membership:

```
GET    /api/v1/persons/{person_id}                          read global Person record (operator-scope)
GET    /api/v1/persons/{person_id}/memberships              cross-tenant memberships for this person
PATCH  /api/v1/persons/{person_id}/profile                  edit global Person (first_name, last_name)
POST   /api/v1/persons/{person_id}/global-suspend           global suspension
POST   /api/v1/persons/{person_id}/lift-global-suspension   lift
POST   /api/v1/persons/{person_id}/anonymise                DPDP (irreversible)
GET    /api/v1/persons/{person_id}/activity                 audit log
```

All require `platform.users.view` or `platform.users.manage` (mutations) — `is_platform=true` JWT.

**Rename note:** these were `/api/v1/platform/persons/{...}` in the existing backend. **Drop the `/platform/` prefix** for consistency — the resource is `persons`, the auth gate is the permission, not the path.

If keeping path namespacing helps audit clarity, an alternative: `/api/v1/identity/persons/{...}` — but the simpler form (no namespace) matches Stripe / Auth0 / GitHub.

### B.4 Search across the system

```
GET /api/v1/search?q=<term>&types=tenants,members,persons&limit=10
auth + (varies — see below)
→ {
    tenants: [{ id, slug, display_name, status, match_field }],
    members: [{ id, tenant_id, tenant_slug, person_id, email, name, status, match_field }],
    persons: [{ id, email, name, status, match_field }]
  }
```

Powers Cmd+K. Each result type is gated by the appropriate permission:

- `tenants` requires `platform.tenants.view` OR `identity.tenants.view` (returns only the user's own tenant)
- `members` requires `identity.users.view` in some scope
- `persons` requires `platform.users.view`

A tenant-user's search returns only their own tenant + their own membership. An operator's search spans the system.

This is Stripe Dashboard's omni-search, Linear's Cmd+K, GitHub's `/` search.

### B.5 Per-tenant stats

```
GET /api/v1/tenants/{id}/stats[?tenant_id=]
auth + identity.tenants.view (own) | platform.tenants.view (any)
→ {
    members_total, members_active, members_pending, members_inactive,
    roles_total, roles_custom,
    sessions_active_24h,
    last_activity_at,
    storage_used_bytes, storage_quota_bytes
  }
```

Powers the tenant detail page's hero section.

### B.6 Platform-wide stats with deltas

```
GET /api/v1/platform/stats?delta_window=7d
auth + platform.tenants.view
→ {
    tenants: { total: 142, active: 138, suspended: 3, delta_7d: +12 },
    persons: { total: 487, delta_7d: +34 },
    memberships: { active: 521, delta_7d: +28 },
    impersonation: { active_sessions: 2 },
    last_event_at: "2026-05-18T..."
  }
```

`delta_window` accepts `24h | 7d | 30d`. Replaces the flat stats endpoint.

### B.7 Impersonation — scoped JWT issuance

The existing `POST /api/v1/platform/impersonation/sessions` returns `{ session_id, expires_at_utc }` only. **Extend response** to include the scoped token pair:

```
POST /api/v1/platform/impersonation/sessions
  body: { target_tenant_id (UUID or slug), reason (>=10 chars), duration_minutes (1..240, default 30) }
  → 201 {
       session_id,
       expires_at_utc,
       access_token,      // scoped JWT (sub=operator-person-id; tenant_id=target; impersonator_id=operator)
       refresh_token,     // also scoped; one-use rotation per existing refresh semantics
       target_tenant: { id, slug, display_name }
     }
```

JWT claim shape during impersonation (per architecture-correction spec):

```
{
  "sub": "<operator-person-id>",
  "tenant_id": "<target-tenant-id>",
  "tenant_slug": "<target-tenant-slug>",
  "membership_id": "<synthesized or seed-admin>",
  "is_platform": false,                 // demoted during impersonation
  "is_super_user": false,               // demoted
  "permissions": [...],                 // effective permissions of the target's CompanyOwner role
  "impersonator_id": "<operator-person-id>",
  "impersonator_membership_id": "<operator's platform membership>",
  "impersonation_session_id": "<session-id>",
  "exp": <ts>,
  "iat": <ts>
}
```

End-impersonation:

```
DELETE /api/v1/platform/impersonation/sessions/{sessionId}
  → 204
  Server marks session ended, revokes the scoped refresh-token family,
  audit event ImpersonationSessionEnded(operator, target, duration_actual).
```

Frontend, on end, restores the operator's original (pre-impersonation) token pair from a separate localStorage entry.

### B.8 Platform tenant — special read

Convenience endpoint for the operator dashboard's "Your platform" shortcut + the seed-check on the bootstrap flow:

```
GET /api/v1/platform/tenant
auth + is_platform
→ TenantDto                  // returns the platform tenant (slug="platform")
```

Equivalent to `GET /v1/tenants/platform` but more discoverable / explicit for clients.

---

## C. Endpoints to deprecate / remove

These were prototypes / parallel implementations that became unnecessary once `?tenant_id=` overload + `is_platform` bypass are in place:

```
GET /api/v1/platform/tenants                              → use GET /v1/tenants
GET /api/v1/platform/tenants/{id}                         → use GET /v1/tenants/{id-or-slug}
GET /api/v1/platform/persons/{id}                         → use GET /v1/persons/{id}
GET /api/v1/platform/persons/{id}/memberships             → use GET /v1/persons/{id}/memberships
PATCH /api/v1/platform/persons/{id}/profile               → use PATCH /v1/persons/{id}/profile
POST /api/v1/platform/persons/{id}/global-suspend         → use POST /v1/persons/{id}/global-suspend
POST /api/v1/platform/persons/{id}/lift-global-suspension → use POST /v1/persons/{id}/lift-global-suspension
POST /api/v1/platform/persons/{id}/anonymise              → use POST /v1/persons/{id}/anonymise
```

Keep:

- `POST/DELETE/GET /api/v1/platform/impersonation/sessions` (this IS a platform-scoped concept)
- `GET /api/v1/platform/stats` (platform-wide aggregation; no tenant-scope analog)
- `GET /api/v1/platform/tenant` (the convenience helper above)

The principle: anything that operates ON A TENANT (even from an operator's seat) uses the regular tenant-scoped path. Anything that operates ON THE PLATFORM AS A WHOLE (cross-tenant aggregation, impersonation session ledger) uses the `/platform/` prefix.

---

## D. Auth model — concrete rules

| Caller's JWT                                 | Reachable resources                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Unauthenticated                              | `POST /v1/auth/login` only                                                                                       |
| Tenant-user (regular member)                 | Their own profile / sessions; their tenant's data they have permissions for                                      |
| Tenant-admin                                 | All of the above + their tenant's members, roles, settings                                                       |
| Platform-staff (is_platform=true, not super) | All tenants' read endpoints (cross-tenant RLS bypass); platform-stats read                                       |
| Platform-super (is_super_user=true)          | All of the above + tenant lifecycle, person mutations, impersonation, DPDP                                       |
| **Impersonated** (operator with scoped JWT)  | Acts AS a tenant-admin in the target tenant; cannot escalate back to operator scope without ending impersonation |

### D.1 The platform tenant — protections

Backend already implements `ensureNotPlatformTenant` for hard-delete. Extend to lifecycle:

- `POST /v1/tenants/platform/suspend` → 422 `platform_tenant_protected`
- `POST /v1/tenants/platform/activate` → no-op (always active)
- `POST /v1/tenants/platform/mark-for-deletion` → 422
- `POST /v1/tenants/platform/restore` → no-op

The platform tenant is by definition always active. Operators cannot suspend the system they're managing.

### D.2 SuperAdmin role — seed-only

The SuperAdmin role (with `is_super_admin=true`) is seeded once in the platform tenant. Backend should reject:

- `POST /v1/roles` with `is_super_admin: true` from the request → 422 (the flag is server-internal)
- Adding the SuperAdmin role to non-platform memberships → 422

Pairs with the existing assertion that the SuperAdmin role's `is_super_admin` flag is seed-only.

---

## E. Migration path for the backend

A reasonable order if breaking up the work:

1. **A.4 — Mutation responses return DTO** (one PR per resource: tenants → users → roles)
2. **A.5 — Structured errors** (one cross-cutting PR; touches the error-writer helper)
3. **A.1 — `?tenant_id=` override on tenant-scoped reads** (3 endpoints: /v1/users, /v1/users/{id}, /v1/roles)
4. **A.3 — Slug-or-UUID on `GET /v1/tenants/{key}`** (one endpoint)
5. **B.1 — Capabilities endpoint** (one PR; mirrors JWT-claim assembly logic)
6. **A.2 — Pagination + search** (one PR per list endpoint)
7. **B.2 — Audit log read endpoints** (4 endpoints; reads from existing outbox)
8. **B.7 — Impersonation scoped-JWT extension** (extend the existing POST response shape)
9. **B.3 — Person registry path consolidation** (rename `/platform/persons/*` → `/persons/*`; keep redirects for back-compat one release)
10. **B.4 — Cmd+K search endpoint** (one new endpoint; aggregates queries)
11. **B.5 / B.6 — Per-tenant + platform stats with deltas**
12. **B.8 — Platform tenant convenience endpoint**

Phases 1-5 unblock the bulk of the frontend redesign. Phases 6-8 are the "v2 canon" arrival. Phases 9-12 are polish.

---

## F. What the frontend gets in return

Once these land, the frontend collapses:

- One `useUsers(tenantSlug)` query hook works for both tenant-admin (own tenant) and operator (any tenant). No separate `lib/features/operator/people` module — it merges into `lib/features/users`.
- One `useTenant(slug)` hook reads any tenant via slug. No separate `lib/features/operator/tenants/api.listTenants()` — it's `useTenants()` with the operator's JWT.
- Capabilities-driven nav replaces the hardcoded `tier.ts` + `nav.ts` matrix.
- Cmd+K is one endpoint.
- Error rendering routes through the structured-error fields shape.

Estimated frontend code deletion: ~30% of `lib/features/operator/*` becomes redundant once the path consolidation lands.

---

## Summary of changes vs. today

**Backend additions** (12 endpoints / extensions):

1. `?tenant_id=` on `/v1/users[/{id}]`, `/v1/roles[/{id}]` reads
2. `?q=&cursor=&limit=&sort=&order=&<filter>=` on `/v1/tenants`, `/v1/users`, `/v1/roles` lists
3. `GET /v1/tenants/{slug-or-uuid}` (overload existing endpoint)
4. Mutation responses return the updated DTO (200 not 204)
5. Structured error response shape with `fields` + `trace_id`
6. `GET /v1/auth/me/capabilities`
7. `GET /v1/tenants/{id}/activity`, `/v1/users/{id}/activity`, `/v1/persons/{id}/activity`, `/v1/auth/me/activity`
8. `GET /v1/persons/{id}/*` (rename from `/v1/platform/persons/*`)
9. `GET /v1/search`
10. `GET /v1/tenants/{id}/stats`
11. `GET /v1/platform/stats?delta_window=`
12. `POST /v1/platform/impersonation/sessions` — extend response with scoped access_token + refresh_token
13. `GET /v1/platform/tenant` (the platform-tenant convenience read)

**Backend deprecations:**

- `/v1/platform/tenants*` (use `/v1/tenants*` with operator JWT)
- `/v1/platform/persons*` (use `/v1/persons*`)

**Backend guards to add:**

- Lifecycle endpoints (suspend / mark-for-deletion / etc.) reject when target is the platform tenant
- Role creation rejects `is_super_admin: true` in request
- Role assignment rejects SuperAdmin role on non-platform memberships
