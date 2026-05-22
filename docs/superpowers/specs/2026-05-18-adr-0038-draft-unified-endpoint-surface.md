# ADR 0038 (DRAFT for `leadkart-go` repo) — Unified endpoint surface with identity-driven scoping

**Status:** Proposed (revised 2026-05-21: frontend implementation shipped; X-Tenant-Id is now BFF-injected, not browser-injected)
**Date:** 2026-05-18 (revised 2026-05-21)
**Deciders:** Backend + Frontend leads
**Supersedes:** None
**Related:** ADR 0036 (permission model), `docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md` (BFF cookie + scope contract — implementation reference for §2 + §A.1.1 below), security.md "Login flow", multi-tenancy.md "SuperUser god-mode", `docs/specs/2026-05-18-backend-endpoints-corrected.md` (frontend repo)

> **Frontend authors note:** This is a DRAFT of the ADR text for the leadkart-go repo. Copy into `leadkart-go/docs/adr/0038-unified-endpoint-surface.md`. The ADR locks the architectural decision so a future contributor doesn't accidentally reintroduce a `/v1/platform/{resource}` parallel hierarchy.
>
> **2026-05-21 revision:** Frontend has shipped the cookie-driven operator scope (see related BFF ADR). The X-Tenant-Id header is **set by the SvelteKit BFF only** — extracted from the `lk_op_tenant` httpOnly cookie that the BFF writes when the operator enters scope. The browser does not send X-Tenant-Id, and any value it does send must be ignored by the BFF. Go can keep its existing JWT-bridge logic unchanged; the source of X-Tenant-Id is now the BFF, not the browser. The slug never appears in the browser URL bar — `GET /v1/tenants/by-slug/{slug}` is still required, but it is called by the BFF (via `POST /api/operator/scope`), not by client-side JavaScript.

---

## Context

The backend today exposes two parallel HTTP surfaces for the same resources:

- `/api/v1/{resource}` — tenant-scoped (callers' JWT `tenant_id` claim drives RLS)
- `/api/v1/platform/{resource}` — operator-scoped (callers' JWT `is_platform=true` bypasses RLS)

Concrete examples:

- `GET /v1/tenants/{id}` (tenant reads its own) vs `GET /v1/platform/tenants` (operator lists all)
- `POST /v1/users/{id}/deactivate` (tenant-admin deactivates a member) vs `POST /v1/platform/persons/{id}/global-suspend` (operator suspends a person globally)

This pattern is **older** than RBAC + claim-based auth. It dates from pre-Auth0-era admin tooling where "is this person an operator?" was determined by URL path rather than identity. Mature multi-tenant SaaS products converged on identity-driven scoping (JWT claims + scoped tokens + auth-context headers) over the past decade.

The frontend redesign exposed this duality as a recurring source of friction:

- Two API client modules per resource (operator vs tenant)
- Duplicate gateway code (one Zod schema set per side)
- Inconsistent permission gating (some paths use perm names, others use `is_platform` flag)
- 30%+ duplicated code in `lib/features/operator/*` vs `lib/features/*`

Frontend redesign spec `2026-05-18-operator-surface-v2-canon.md` and follow-up `2026-05-18-backend-endpoints-corrected.md` propose collapsing the dual surface into a single resource hierarchy with identity-driven scope.

## Convergent industry pattern (canon audit)

| Vendor               | Scoping mechanism                                                                    | Path hierarchy                                      |
| -------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| **Stripe Connect**   | `Stripe-Account: acct_xxx` header + platform secret key                              | Single `/v1/customers`; no `/v1/platform/customers` |
| **AWS**              | STS `AssumeRole` returns scoped credentials; ARN identifies resource                 | One resource path; identity drives scope            |
| **Auth0 Management** | Subdomain = tenant scope (`{tenant}.auth0.com/api/v2/users`)                         | No parallel admin surface                           |
| **Microsoft Graph**  | `/me` is an alias for `/users/{caller-id}`; same family                              | Same endpoint; identity differentiates              |
| **GitHub**           | `/orgs/{org}/...` is scope-as-path-param; admin uses same paths with org-owner token | No `/platform/orgs/...`                             |
| **Salesforce**       | Workspace + identity-driven                                                          | Same shape across orgs                              |

**Convergent rule: the JWT (or other credential) is the scope. Paths describe resources, not personas.**

Stripe Connect is the most-evolved reference because it operates the largest live multi-tenant + multi-persona surface in the industry. Its model:

- Single resource paths: `/v1/customers`, `/v1/charges`, `/v1/payouts`
- `Stripe-Account` header chooses which connected account's data the platform's API key is acting on
- Platform-only operations (account creation, transfers between accounts) are the only paths under a platform prefix

This ADR adopts Stripe Connect's shape for LeadKart.

## Decision

LeadKart's HTTP API will use a **single unified resource hierarchy** with **identity-driven scope** via three mechanisms (low to high friction):

### 1. JWT `tenant_id` claim — implicit scope (no change from today)

The JWT's `tenant_id` claim pins the caller to their tenant. RLS enforces isolation. Default behavior.

### 2. `X-Tenant-Id` header — read-side scope override (BFF-authoritative)

For read-only operator queries on another tenant:

```
GET /api/v1/users
X-Tenant-Id: <target-tenant-uuid>
Authorization: Bearer <operator JWT with is_platform=true>
```

The JWT-bridge middleware reads `X-Tenant-Id`, validates against `is_platform`, and sets the `app.current_tenant` GUC to the target tenant for the duration of the request. RLS naturally scopes the query.

- If `JWT.is_platform=false`: header silently ignored; JWT-pinned scope stays in effect
- If `JWT.is_platform=true`: header honored; RLS scopes to target tenant
- Header carries UUID only; slug → UUID resolution is a dedicated endpoint (see lookup section)

**Source of `X-Tenant-Id` (revised 2026-05-21):** The header is set by the **SvelteKit BFF**, never by the browser. The BFF reads the `lk_op_tenant` httpOnly cookie (written when the operator entered scope via `POST /api/operator/scope`) and injects the resulting UUID on every upstream call. Any `X-Tenant-Id` header that the browser sends is dropped at the BFF — the cookie is the single source of truth for operator scope.

This means Go's defense-in-depth validation (does `is_platform` allow this header?) is still useful, but in practice Go will never see a forged header on this leg — the BFF won't forward one. Go's job is to confirm the JWT's claims authorize the requested scope; the frontend's job is to never let a non-authoritative writer touch the header.

Header choice over query param is intentional — see ADR §Rationale below.

### 3. Scoped-JWT impersonation — write-side scope

Mutations on another tenant require an explicit impersonation session:

```
POST /api/v1/platform/impersonation/sessions
  body: { target_tenant_id, reason (>=10 chars), duration_minutes }
  → 201 {
      session_id,
      expires_at_utc,
      access_token,           // scoped JWT pinned to target tenant
      refresh_token,          // scoped refresh-token family
      target_tenant: { id, slug, display_name }
    }
```

The scoped JWT pins the operator to act as a tenant-admin in the target tenant:

```jsonc
{
  "sub": "<operator-person-id>",              // forensic anchor — original identity preserved
  "tenant_id": "<target-tenant-id>",
  "tenant_slug": "<target-tenant-slug>",
  "membership_id": "<seed-admin or synthetic>",
  "is_platform": false,                        // demoted during impersonation
  "is_super_user": false,                      // demoted
  "permissions": [...],                        // effective permissions of target's CompanyOwner role
  "act": {                                     // RFC 8693 §2 actor claim
    "sub": "<operator-person-id>",
    "membership_id": "<operator's platform membership>",
    "session_id": "<impersonation-session-id>"
  },
  "exp": <ts>,
  "iat": <ts>
}
```

The `act` claim (RFC 8693 OAuth Token Exchange §2) is the canonical place for delegated-actor information. All subsequent API calls during impersonation use the scoped JWT; RLS naturally scopes; audit log records both `sub` (acting identity) and `act.sub` (real operator).

End impersonation revokes the scoped refresh-token family and (optionally) blacklists the access token until expiry.

### 4. Path hierarchy — single resource tree

```
/api/v1/auth/...                            unchanged
/api/v1/auth/me/{profile,sessions,activity,capabilities}      caller-scoped self-service

/api/v1/tenants                            list (with X-Tenant-Id ignored for callers; operator sees all)
/api/v1/tenants/{tenantId}                 detail by UUID
/api/v1/tenants/by-slug/{slug}             detail by slug — convenience overlay
/api/v1/tenants/{id}/{profile|statutory|contact|settings|display-preferences}     existing tenant-self ops
/api/v1/tenants/{id}/{suspend|activate|mark-for-deletion|restore}                 lifecycle (operator only, gated by perm)
/api/v1/tenants/{id}/stats                                                        per-tenant counts
/api/v1/tenants/{id}/activity                                                     per-tenant audit log

/api/v1/users[?X-Tenant-Id]                tenant-scoped (or X-Tenant-Id-overridden); membership operations
/api/v1/users/{membershipId}/...           detail + per-member operations
/api/v1/users/{membershipId}/activity      per-member audit log

/api/v1/roles[?X-Tenant-Id]                tenant-scoped roles
/api/v1/roles/{roleId}/...                 detail + permission operations

/api/v1/persons/{personId}                 global identity (operator-only by permission)
/api/v1/persons/{personId}/memberships     cross-tenant memberships for this person
/api/v1/persons/{personId}/global-suspend  global suspension
/api/v1/persons/{personId}/anonymise       DPDP irreversible
/api/v1/persons/{personId}/activity        cross-tenant activity

/api/v1/search                             omni-search (Cmd+K)

/api/v1/platform/...                       ONLY genuinely platform-wide operations:
  - /platform/stats                        cross-tenant aggregations (cannot be tenant-scoped)
  - /platform/impersonation/sessions       impersonation session ledger (cross-tenant by definition)
  - /platform/tenant                       convenience read of the platform tenant itself
```

The `/platform/` prefix shrinks from a parallel hierarchy to a small set of genuinely-cross-tenant endpoints. Everything else collapses into the single resource tree, with identity-driven scope.

### 5. Deprecations (1 release of back-compat redirects)

```
GET /v1/platform/tenants                              → 301 → /v1/tenants
GET /v1/platform/tenants/{id}                         → 301 → /v1/tenants/{id}
GET /v1/platform/persons/{id}                         → 301 → /v1/persons/{id}
GET /v1/platform/persons/{id}/memberships             → 301 → /v1/persons/{id}/memberships
PATCH /v1/platform/persons/{id}/profile               → 301 → /v1/persons/{id}/profile
POST /v1/platform/persons/{id}/global-suspend         → 301 → /v1/persons/{id}/global-suspend
POST /v1/platform/persons/{id}/lift-global-suspension → 301 → /v1/persons/{id}/lift-global-suspension
POST /v1/platform/persons/{id}/anonymise              → 301 → /v1/persons/{id}/anonymise
```

After 1 release, redirects are removed and the `/v1/platform/{tenants,persons}/*` paths return 404.

### 6. Special guards (defense-in-depth)

The platform tenant is a regular tenant in the data model but has invariants that must hold:

- `POST /v1/tenants/platform/suspend` → 422 `platform_tenant_protected`
- `POST /v1/tenants/platform/mark-for-deletion` → 422 `platform_tenant_protected`
- `POST /v1/tenants/platform/restore` → no-op 204 (always active)
- `DELETE /v1/tenants/platform` → 422 `platform_tenant_undeletable` (existing — `ErrPlatformTenantUndeletable`)
- `POST /v1/roles` with `is_super_admin: true` → 422 (flag is server-internal, never accepted from caller)
- `POST /v1/users/{id}/roles` assigning SuperAdmin role to a membership in a non-platform tenant → 422

## Rationale

### Why header (`X-Tenant-Id`) over query param (`?tenant_id=`)

1. **Access-log hygiene.** Query params are logged by default in nginx, Cloudflare, every CDN. A log of every tenant an operator probed is needless metadata exfiltration. Headers are not auto-logged.
2. **Browser history / linkability.** Query-param URLs are bookmarked, pasted in chat, indexed by browser history. Headers don't appear in URL.
3. **Semantic correctness.** `?tenant_id=` reads as a filter parameter alongside `?q=` and `?sort=`. Tenant is **auth context**, not a search filter. The shape should reflect the semantics.
4. **Cache key sanity.** HTTP intermediaries cache by URL. Switching operator-probed tenants by URL parameter risks cross-tenant cache contamination on a misconfigured CDN.

Stripe's `Stripe-Account` header is the most-used implementation of this exact pattern — it has run in production at internet scale for ~10 years.

### Why two endpoints (`/{id}` + `/by-slug/{slug}`) over one overloaded path

1. **Handler doesn't have to regex-discriminate** UUID vs slug per request.
2. **OpenAPI generation** produces two distinct operations with distinct path-param types (UUID vs string), which downstream client generators handle cleanly.
3. **Tests are clearer** — each route has a single contract; no "did we hit the UUID branch or the slug branch?" ambiguity.
4. **Performance** — UUID lookup is a primary-key hit; slug lookup is an indexed-secondary lookup. Different cost models, separate logging.

GitHub's `/users/{username}` + `/user/{id}` (numeric ID) split is the most-used implementation. ~20 years of production at scale.

**Note (2026-05-21):** The slug-based endpoint is called by the SvelteKit BFF (`POST /api/operator/scope` resolves slug → UUID, stores result in cookie). It is **not** called from client-side JavaScript any more — the slug is treated as customer-identifying data that should not leak through browser history, Referer headers, or shared URLs. See the BFF ADR for the full operator-scope flow.

### Why scoped JWT (not just `X-Impersonation-Session-Id` header) for impersonation

The header-only model (operator JWT + impersonation-session-id header) leaves `is_platform=true` in the operator's claims, which means RLS still sees the operator as elevated. Mutations under that header would risk silent privilege escalation if the header is forgotten on one call.

The scoped-JWT model **demotes** the operator's permissions to those of the target tenant's CompanyOwner role (or a synthesized least-privilege role). Even if the operator's code forgets the impersonation context, they can't accidentally mutate cross-tenant during the session — their JWT itself doesn't authorize it.

This is the AWS STS AssumeRole posture: the temporary credentials are LESS PRIVILEGED than the calling identity. Defense in depth.

The `act` claim (RFC 8693) preserves the forensic chain: the audit log can always answer "who really did this?" by reading `act.sub`.

### Why path consolidation, not just adding the new shape and leaving the old

Two surfaces means two test surfaces, two doc surfaces, two security review surfaces. The drift cost compounds.

LeadKart is at ~3 controllers per resource today. The cleanup cost is low. After Phase 2 ships (marketplace + lead credits, multiplying resources ~10x), the cleanup cost becomes prohibitive. Doing it now is materially cheaper.

The deprecation window (1 release of 301 redirects) gives existing clients a smooth migration path without coupling the cleanup to a hard cutover.

## Consequences

**Positive:**

- Single resource hierarchy → ~30% reduction in frontend code (the operator-side parallel modules collapse)
- Identity-driven scope is testable in isolation (auth + RLS) without touching every controller
- Impersonation becomes a security primitive with clear semantics, not an ad-hoc audit recorder
- New resources (marketplace listings, lead credits, CRM leads) inherit the pattern; no new path hierarchy to maintain
- OpenAPI / Swagger generation is straightforward — one path per resource, two scopes via header

**Negative / cost:**

- Existing clients (if any) using `/v1/platform/tenants*` and `/v1/platform/persons*` paths must migrate within 1 release
- JWT-bridge middleware grows by ~20 lines (read header, validate, set GUC)
- Impersonation handler needs to mint scoped JWT pair (instead of returning session ID only) — new code path, but mostly composing existing token-minting logic with different claims
- Test matrix grows — every endpoint needs a "with X-Tenant-Id, is_platform=true" test row alongside the existing "JWT-pinned tenant" row

**Neutral:**

- ProblemDetails error responses are a richer shape but don't change behavior; clients that pattern-match on `code` continue to work
- Mutation-returns-DTO change is additive (200 with body instead of 204 empty); old clients ignoring response body still work

## Implementation order

Per `2026-05-18-backend-endpoints-corrected.md` §E migration plan:

1. Mutation responses return updated DTO (E4)
2. Structured error responses — RFC 9457 ProblemDetails (E5)
3. `X-Tenant-Id` header support in JWT-bridge middleware (E1)
4. `GET /v1/tenants/by-slug/{slug}` route (E3)
5. `GET /v1/auth/me/capabilities` (N1)
6. Cursor pagination + search on lists that grow (E2 — only for tenants, users, persons)
7. Audit-log read endpoints (N2)
8. Scoped-JWT impersonation extension (N7)
9. Path consolidation: rename `/v1/platform/persons/*` → `/v1/persons/*` + 301 redirects (N3)
10. Search endpoint (N4)
11. Per-tenant + platform stats with deltas (N5, N6)
12. Platform-tenant convenience read (N8)

Phases 1-5 unblock the bulk of the frontend redesign. Phases 6-9 deliver "v2 canon" parity. Phases 10-12 are polish.

## Related work

- ADR 0036 — Permission-first authorization (claim-based gating; complements this ADR's identity-driven scope)
- security.md "Login flow" — defines the JWT shape this ADR extends
- multi-tenancy.md "SuperUser god-mode" — defines `is_platform`/`is_super_user` semantics this ADR composes
- Frontend spec: `docs/specs/2026-05-18-backend-endpoints-corrected.md` — endpoint inventory
- Frontend architecture correction: `docs/specs/2026-05-18-multi-tenant-architecture-correction.md` — why the path consolidation matters for the UI surface

## References

- RFC 9457 — Problem Details for HTTP APIs (https://www.rfc-editor.org/rfc/rfc9457)
- RFC 8693 — OAuth 2.0 Token Exchange (§2 actor claim) (https://www.rfc-editor.org/rfc/rfc8693)
- Google AIP-158 — Pagination (https://google.aip.dev/158)
- Stripe Connect API reference — `Stripe-Account` header (https://stripe.com/docs/connect/authentication)
- AWS STS — AssumeRole (https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)
- Auth0 Management API — Tenant-prefixed URLs and impersonation deprecation (Auth0 product docs)
- GitHub REST API — Lookup-by-username vs lookup-by-id paths
