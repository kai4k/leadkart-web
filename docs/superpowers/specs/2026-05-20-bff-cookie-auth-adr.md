# ADR: BFF Cookie + CSRF Auth + Operator Scope Contract

**Date:** 2026-05-20 (revised 2026-05-21 to match shipped implementation)
**Status:** Accepted — implemented on `feat/bff-cookie-auth`
**Scope:** leadkart-web (SvelteKit BFF) ↔ leadkart-go (Go API)
**Related:** ADR 0036 (permission model), ADR 0038 (unified endpoint surface)

---

## Context

The original SPA model stored JWTs in `localStorage` and injected them as
`Authorization: Bearer` headers from client-side JavaScript. This is vulnerable
to XSS — any injected script can exfiltrate tokens and impersonate the user.

Additionally, the prior model routed operator tenant context through URL
segments (`/operator/tenants/{slug}/profile`). The slug leaked the customer
identity into browser history, server access logs, the Referer header to any
third-party asset loaded on the page, screen recordings, and shared links.

This ADR locks the implemented contract: an httpOnly cookie auth layer plus
a server-side operator-scope cookie, with the BFF as the authoritative writer
of every security-sensitive header on the upstream Go request.

---

## Decision

SvelteKit (adapter-node) becomes the **BFF (Backend-For-Frontend)**:

```
Browser  ↔  SvelteKit Node BFF  ↔  Go API
              ^                     ^
              ↑ httpOnly cookies    ↑ Bearer + X-Tenant-Id
                                       (server-to-server only)
```

- Browser **never** sees a JWT and **never** sees the active tenant identifier.
- SvelteKit extracts the JWT from the access cookie and the tenant id from the
  scope cookie, and injects both as upstream headers.
- The browser's CSRF token (`lk_csrf`) is the only cookie JavaScript can read,
  and only because it has to echo back in `X-CSRF-Token` on mutations.
- Any browser-supplied `X-Tenant-Id` header is silently dropped at the BFF —
  the cookie is authoritative.

---

## Four Cookies the BFF Issues

| Cookie                                             | httpOnly | Secure                      | SameSite | Path            | MaxAge                | Contents                                                                      |
| -------------------------------------------------- | -------- | --------------------------- | -------- | --------------- | --------------------- | ----------------------------------------------------------------------------- |
| `__Host-lk_access` (prod) / `lk_access` (dev/test) | yes      | yes in prod, no in dev/test | Strict   | `/`             | 900 s (15 min)        | Access JWT                                                                    |
| `lk_refresh`                                       | yes      | yes in prod, no in dev/test | Strict   | `/auth/refresh` | 2 592 000 s (30 days) | Refresh token                                                                 |
| `lk_csrf`                                          | **no**   | yes in prod, no in dev/test | Strict   | `/`             | 900 s                 | CSRF double-submit token (32-byte base64url)                                  |
| `lk_op_tenant`                                     | yes      | yes in prod, no in dev/test | Strict   | `/`             | 28 800 s (8 h)        | `{ id, slug, display_name }` of operator's active tenant scope (JSON-encoded) |

### Why the access-cookie name flips between prod and dev/test

The `__Host-` prefix (RFC 6265bis §4.1.3) is a browser-enforced hardening
that requires the `Secure` flag. Chrome silently rejects `__Host-*` cookies
served over plain HTTP, including localhost. Production is always HTTPS, so
the prefix attaches and the hardening is in force. Dev (`npm run dev`,
`npm run preview`) and Playwright e2e (`NODE_ENV=test`) are HTTP, so we drop
the prefix. Cookie name resolution lives in `src/lib/server/cookies.ts`
(`ACCESS_COOKIE()`).

### Why separate path for `lk_refresh`

Confining the refresh cookie to `Path=/auth/refresh` means the browser never
sends it on ordinary API calls. Even if the BFF proxy were exploited to
reflect an arbitrary response, the refresh token is not present in the
request context for non-refresh paths.

### Why `lk_csrf` is non-httpOnly

JavaScript must be able to read it so it can echo the value in the
`X-CSRF-Token` request header. The CSRF token is not a credential — its
value alone does nothing without the accompanying httpOnly auth cookie,
which JS cannot read.

### Why the operator-scope is a cookie, not a URL segment

The active-tenant identifier (UUID or slug) is customer-identifying data.
Putting it in the URL leaks it to browser history, server access logs,
Referer headers, screen recordings, and any third party who sees a shared
link. The cookie keeps the identifier server-side; the URL stays at the
slug-agnostic `/operator/scope/profile`, `/operator/scope/members`, etc.
Pattern reference: Stripe Test Mode, Linear workspace switcher, GitHub
Enterprise context switch — all use server-side state, not URL state, for
the acting-on context.

### Why `display_name` is in the scope cookie

The cookie is the single source of truth for the active-context pill the
header renders without an extra round-trip. The cookie is rewritten every
time the operator enters scope, so display-name staleness is bounded by
"how long since you last clicked Open" — practical caching, no Go round-trip
on every navigation.

---

## Auth Flow

### Login

```
Browser                   BFF (SvelteKit)               Go API
  │                             │                           │
  │  POST /auth/login           │                           │
  │  { email, password }        │                           │
  │ ──────────────────────────► │                           │
  │                             │  POST /api/v1/auth/login  │
  │                             │  { email, password }      │
  │                             │ ─────────────────────────►│
  │                             │  200 { access_token,      │
  │                             │        refresh_token, ... }│
  │                             │ ◄─────────────────────────│
  │                             │  set-cookie: lk_access    │
  │                             │  set-cookie: lk_refresh   │
  │                             │  set-cookie: lk_csrf      │
  │  200 { ok: true }           │                           │
  │ ◄──────────────────────────┤                           │
```

The browser receives only `{ ok: true }`. Tokens are in cookies; the client
never sees them in the response body.

### Authenticated API Call (read)

```
Browser                   BFF (SvelteKit)               Go API
  │  GET /api/v1/users          │                           │
  │  Cookie: lk_access, lk_op_tenant
  │ ──────────────────────────► │                           │
  │                             │  GET /api/v1/users        │
  │                             │  Authorization: Bearer <jwt>
  │                             │  X-Tenant-Id: <scope.id>  │
  │                             │ ─────────────────────────►│
  │                             │  200 { users: [...] }     │
  │  200 { users: [...] }       │                           │
  │ ◄──────────────────────────┤                           │
```

`X-Tenant-Id` is set by the BFF **only if** the operator-scope cookie is
present. If the browser sent its own `X-Tenant-Id` header, the BFF
deliberately ignores it.

### Mutating API Call (POST / PUT / PATCH / DELETE)

```
Browser                   BFF (SvelteKit)               Go API
  │  POST /api/v1/tenants/{id}/suspend
  │  X-CSRF-Token: <lk_csrf value>
  │ ──────────────────────────► │                           │
  │                             │  constant-time compare:   │
  │                             │  X-CSRF-Token header      │
  │                             │  vs lk_csrf cookie        │
  │                             │  → mismatch: 403          │
  │                             │  → match: forward         │
  │                             │ ─────────────────────────►│
```

CSRF check is `crypto.timingSafeEqual` on equal-length buffers
(`src/lib/server/csrf.ts`). Token entropy makes a timing attack
academic, but constant-time is the Stripe / Netflix house style.

### Token Refresh (automatic, single-flight)

Go returns 401 on an expired access token:

```
BFF detects 401 from Go
  → reads lk_refresh cookie
  → POST /api/v1/auth/refresh to Go
  → Go returns new { access_token, refresh_token }
  → BFF rotates all three auth cookies (access, refresh, csrf)
  → retries the original request (once, with attempt=2 to prevent loops)
```

If refresh also fails (expired, revoked): BFF clears all auth cookies and
the operator-scope cookie, returns 401 to the browser. The client-side error
handler redirects to `/signin`.

### Logout

```
Browser                   BFF (SvelteKit)               Go API
  │  POST /auth/logout          │                           │
  │  X-CSRF-Token: <csrf>       │                           │
  │ ──────────────────────────► │                           │
  │                             │  CSRF check (constant-time)
  │                             │  → mismatch: 403          │
  │                             │  → match: POST /api/v1/auth/logout
  │                             │              { refresh_token }
  │                             │ ─────────────────────────►│
  │                             │  204 (best-effort revoke) │
  │                             │ ◄─────────────────────────│
  │                             │  clears lk_access, lk_refresh,
  │                             │  lk_csrf, lk_op_tenant    │
  │  200 { ok: true }           │                           │
  │ ◄──────────────────────────┤                           │
```

CSRF enforcement on logout closes the trivial cross-site
`<img src=/auth/logout>` force-logout vector. Cookies are cleared
unconditionally on the success branch — even if Go's revoke endpoint is
unreachable, the local session ends.

---

## Operator Scope Flow

The operator clicking a tenant in the list never navigates to a slug-keyed
URL. Instead:

```
Browser                          BFF (SvelteKit)               Go API
  │  POST /api/operator/scope          │                           │
  │  X-CSRF-Token: <csrf>              │                           │
  │  body: { slug: "acme-pharma" }     │                           │
  │ ─────────────────────────────────► │                           │
  │                                    │  CSRF check               │
  │                                    │  GET /api/v1/tenants/by-slug/acme-pharma
  │                                    │  Authorization: Bearer ... │
  │                                    │ ─────────────────────────►│
  │                                    │  200 TenantDto            │
  │                                    │ ◄─────────────────────────│
  │                                    │  set-cookie: lk_op_tenant │
  │                                    │    = { id, slug, display_name }
  │  204 No Content                    │                           │
  │ ◄─────────────────────────────────┤                           │
  │                                                                │
  │  (client clears TanStack cache + invalidateAll + navigates)    │
  │  GET /operator/scope/profile                                   │
  │ ─────────────────────────────────► │                           │
  │                                    │  +layout.server.ts reads  │
  │                                    │  lk_op_tenant cookie      │
  │                                    │  GET /api/v1/tenants/{id} │
  │                                    │ ─────────────────────────►│
  │                                    │  200 TenantDto → page.data.tenant
  │  HTML with tenant.display_name     │                           │
  │  baked into first paint            │                           │
  │ ◄─────────────────────────────────┤                           │
```

Exit context is `DELETE /api/operator/scope` (CSRF-gated) → cookie cleared
→ client clears TanStack cache → `invalidateAll()` → navigate to
`/operator/tenants`.

### Why the client clears the TanStack cache on scope change

The same query key (e.g. `['users','list']`) returns different data
under different `X-Tenant-Id` scopes. Without `queryClient.clear()` on
scope entry/exit, a cached result from the prior scope would leak into
the new one until the staleTime expires.

---

## Server-to-Server Auth (BFF → Go)

The BFF extracts the JWT from the access cookie and forwards it verbatim
as `Authorization: Bearer <jwt>` on every upstream call. No additional
service-to-service credential is used in v0.5.

Go's existing auth middleware (`RequireAuth`) accepts this without
modification. The JWT's claims (tenant_id, membership_id, permissions) are
unchanged — Go's authorization logic is unaffected.

When the operator is in scope, the BFF additionally injects
`X-Tenant-Id: <scope.id>`. Go's JWT-bridge middleware reads the header,
validates against the JWT's `is_platform` claim, and sets the per-request
tenant GUC for RLS scoping per ADR 0038 §2. If the JWT is not
platform-tier, Go ignores the header (defense in depth — the BFF's
authoritative writer pattern doesn't excuse Go from validating).

**Future:** for strict zero-trust deployments, the BFF ↔ Go leg can be
upgraded to mTLS or a separate service credential so Go can reject calls
that didn't originate from the BFF. Out of scope for v0.5.

---

## Deployment Topology

Same-origin assumption (v0.5):

```
[Client Browser]
       │ HTTPS
       ▼
[Reverse proxy: nginx / Caddy]
  ├── / → SvelteKit Node BFF  (port 3000)
  └── /  (upstream)  ← BFF calls this internally
                         Go API (port 8080, not public)
```

Browser only ever talks to the SvelteKit BFF origin. Go is not reachable
from the browser — it is behind the reverse proxy or in the same K8s pod.
No cross-origin CORS concerns for the BFF ↔ Go leg.

**Environment variable:** `GO_API_URL=http://localhost:8080` (dev).
Production sets this via the deployment environment. Playwright e2e sets
`GO_API_URL=http://localhost:9999` to point at the mock Go server.

---

## Dev / Test Mode

`secure: true` on cookies requires HTTPS. In Vite dev (`npm run dev`) and
the Playwright preview (`npm run preview`), the server is HTTP. The cookie
helpers in `src/lib/server/cookies.ts` read `env.NODE_ENV` and set
`secure: false` when `NODE_ENV !== 'production'` so dev cookies work over
HTTP. The access-cookie name also flips off the `__Host-` prefix in that
mode, since Chrome rejects `__Host-*` without `Secure`.

This relaxation is **never** active in production builds — the only switch
is `NODE_ENV`, and production deploys with `NODE_ENV=production`.

---

## Failure Modes

| Scenario                                    | BFF Response                                               | Client Behaviour                                                     |
| ------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| Go is down / unreachable                    | 502 Bad Gateway                                            | API client throws `NetworkError`; toast "connection error"           |
| Access cookie missing on (app) route        | `+layout.server.ts` redirects to `/signin?next=<orig>`     | User lands at sign-in; post-login returns to original path           |
| CSRF token missing / mismatch               | 403 `csrf_mismatch`                                        | API client throws `AuthError`; component shows error                 |
| Access expired, refresh succeeds            | Transparent — BFF rotates cookies + retries                | User sees no interruption                                            |
| Access expired, refresh fails               | BFF clears auth + scope cookies + returns 401              | API client throws `AuthError`; session store calls `goto('/signin')` |
| Refresh expired (30-day TTL)                | Same as refresh-fails path                                 | Re-login required                                                    |
| Scope cookie missing on `/operator/scope/*` | `+layout.server.ts` redirects to `/operator/tenants`       | Operator picks a tenant from the list to re-enter scope              |
| Scope cookie present but tenant 404'd       | BFF clears scope cookie + redirects to `/operator/tenants` | Tenant gone (deleted, renamed); operator picks another               |
| SSR capabilities call 500                   | `+layout.server.ts` redirects to `/signin`                 | User must re-login                                                   |

---

## What Changed vs. Previous SPA Model

| Concern                | Before                                                            | After                                                               |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Token storage          | `localStorage` (`leadkart-session` key)                           | httpOnly cookies                                                    |
| Token exposure         | JS-readable (XSS risk)                                            | Opaque to JS                                                        |
| Auth header injection  | Client-side (`api/client.ts` hooks)                               | BFF server-side                                                     |
| 401 refresh            | Client-side refresh loop                                          | BFF proxy layer, single-flight                                      |
| Session bootstrap      | Client-side JWT decode + localStorage                             | SSR `+layout.server.ts` → `page.data.capabilities` baked into HTML  |
| Operator tenant scope  | URL segment: `/operator/tenants/{slug}/...`                       | httpOnly cookie `lk_op_tenant`, URL is `/operator/scope/...`        |
| Slug → UUID resolution | Browser fetched `GET /v1/tenants/by-slug/{slug}` after navigation | BFF resolves on `POST /api/operator/scope`, stores result in cookie |
| `X-Tenant-Id` writer   | Browser opt-in via `withTenant(id)` helper                        | BFF only (browser values ignored)                                   |
| CSRF compare           | n/a                                                               | `crypto.timingSafeEqual`                                            |
| Adapter                | `adapter-static` (CDN deploy)                                     | `adapter-node` (Node server)                                        |

---

## Files Involved

| File                                                              | Role                                                                             |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/server/cookies.ts`                                       | `ACCESS_COOKIE()`, `setAuthCookies`, `clearAuthCookies`; HTTP/HTTPS switch       |
| `src/lib/server/scope.ts`                                         | `OP_TENANT_COOKIE`, `setOperatorScope`, `getOperatorScope`, `clearOperatorScope` |
| `src/lib/server/csrf.ts`                                          | `timingSafeEqualString` — constant-time CSRF compare                             |
| `src/lib/api/csrf.ts`                                             | `getCsrfToken()` — client-side reader for the non-httpOnly `lk_csrf`             |
| `src/routes/api/[...path]/+server.ts`                             | Transparent BFF proxy; CSRF gate; auto-refresh; Bearer + scope injection         |
| `src/routes/api/operator/scope/+server.ts`                        | `POST` enters scope (slug → UUID resolution + cookie set); `DELETE` exits        |
| `src/routes/auth/login/+server.ts`                                | Login → sets auth cookies                                                        |
| `src/routes/auth/logout/+server.ts`                               | CSRF-gated logout → clears all four cookies                                      |
| `src/routes/(app)/+layout.server.ts`                              | SSR auth guard + capabilities bootstrap                                          |
| `src/routes/(app)/operator/scope/+layout.server.ts`               | Reads `lk_op_tenant`, fetches canonical TenantDto, exposes `page.data.tenant`    |
| `src/lib/api/client.ts`                                           | CSRF header injection; `credentials: 'same-origin'`                              |
| `src/lib/features/auth/stores/session.svelte.ts`                  | Derived from `page.data.capabilities` — no localStorage                          |
| `src/lib/features/auth/queries.ts`                                | `myCapabilitiesQuery` seeded with SSR `initialData`                              |
| `src/lib/features/operator/tenants/components/TenantsList.svelte` | Scope-entry: POST `/api/operator/scope` → clear cache → navigate                 |

---

## Test Strategy

E2e tests run two web servers in parallel via `playwright.config.ts`:

1. **Mock Go server** (`tests/e2e/mock-server/server.mjs`) on port 9999 —
   tests push fixtures via `POST /_mock/register` before each scenario.
   This is what makes Playwright viable post-BFF: server-to-server BFF→Go
   fetches are invisible to `page.route()`, so the only way to stub Go is
   to run a real HTTP server the BFF actually hits.
2. **SvelteKit preview** on port 4173 with `GO_API_URL=http://localhost:9999`.

Reference spec: `tests/e2e/operator-tenant-management.spec.ts` — verifies the
scope entry/exit flow, the URL-invariant (no slug, no UUID anywhere in the
browser path or query), the BFF's X-Tenant-Id forwarding, and the CSRF
gate on `/api/operator/scope`.
