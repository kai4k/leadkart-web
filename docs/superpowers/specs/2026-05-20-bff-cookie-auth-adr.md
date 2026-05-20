# ADR: BFF Cookie + CSRF Auth Contract (Frontend ↔ Go)

**Date:** 2026-05-20
**Status:** Accepted
**Scope:** leadkart-web (SvelteKit BFF) ↔ leadkart-go (Go API)

---

## Context

The original SPA model stored JWTs in `localStorage` and injected them as
`Authorization: Bearer` headers from client-side JavaScript. This is vulnerable
to XSS: any injected script can exfiltrate tokens and impersonate the user. The
backend team is shipping cookie + CSRF support. This ADR locks the frontend
contract.

## Decision

SvelteKit (adapter-node) becomes the **BFF (Backend-For-Frontend)**:

```
Browser  ↔  SvelteKit Node BFF  ↔  Go API
              ^                     ^
              ↑ httpOnly cookies    ↑ Bearer token (server-to-server)
```

- Browser **never** sees a JWT. Tokens are confined to the BFF's Node process.
- SvelteKit extracts the JWT from the httpOnly cookie and injects it as
  `Authorization: Bearer` on every outbound Go request.
- No changes required to Go's existing auth middleware — it still accepts Bearer.

---

## Three Cookies the BFF Issues

| Cookie             | httpOnly | Secure | SameSite | Path            | MaxAge                | Contents                                     |
| ------------------ | -------- | ------ | -------- | --------------- | --------------------- | -------------------------------------------- |
| `__Host-lk_access` | yes      | yes    | Strict   | `/`             | 900 s (15 min)        | Access JWT                                   |
| `lk_refresh`       | yes      | yes    | Strict   | `/auth/refresh` | 2 592 000 s (30 days) | Refresh token                                |
| `lk_csrf`          | **no**   | yes    | Strict   | `/`             | 900 s (15 min)        | CSRF double-submit token (32-byte base64url) |

**Why `__Host-` prefix on the access cookie?**
The `__Host-` prefix (RFC 6265bis §4.1.3) forces `Secure`, a `Path=/`, and
no `Domain` attribute — the browser will only send the cookie to the exact
same host. This prevents cookie-stuffing attacks from sibling subdomains.

**Why separate path for `lk_refresh`?**
Confining the refresh cookie to `Path=/auth/refresh` means the browser never
sends it on ordinary API calls. Even if the BFF proxy were exploited to
reflect an arbitrary response, the refresh token is not present in the request
context.

**Why `lk_csrf` is non-httpOnly?**
JavaScript must be able to read it so it can echo the value in the
`X-CSRF-Token` request header. The CSRF token is not a credential — its
value alone does nothing without the accompanying httpOnly auth cookie, which
JS cannot read.

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
  │                             │  set-cookie: __Host-lk_access
  │                             │  set-cookie: lk_refresh
  │                             │  set-cookie: lk_csrf
  │  200 { ok: true }           │                           │
  │ ◄──────────────────────────┤                           │
```

The browser receives only `{ ok: true }`. Tokens are in cookies; the client
never sees them in the response body.

### API Call (authenticated)

```
Browser                   BFF (SvelteKit)               Go API
  │                             │                           │
  │  GET /api/v1/users/me       │                           │
  │  Cookie: __Host-lk_access   │                           │
  │ ──────────────────────────► │                           │
  │                             │  GET /api/v1/users/me     │
  │                             │  Authorization: Bearer <jwt>
  │                             │ ─────────────────────────►│
  │                             │  200 UserDto              │
  │                             │ ◄─────────────────────────│
  │  200 UserDto                │                           │
  │ ◄──────────────────────────┤                           │
```

### Mutating API Call (POST/PUT/PATCH/DELETE)

Browser must include `X-CSRF-Token: <value-from-lk_csrf-cookie>` header.
BFF validates: `header value === lk_csrf cookie value`. Mismatch → 403.

### Token Refresh (automatic)

Go returns 401 on an expired access token:

```
BFF detects 401 from Go
  → reads lk_refresh cookie
  → POST /api/v1/auth/refresh to Go
  → Go returns new { access_token, refresh_token }
  → BFF rotates all three cookies (__Host-lk_access, lk_refresh, lk_csrf)
  → retries the original request (once)
```

If refresh also fails (expired, revoked): BFF clears all three cookies and
returns 401 to the browser. The client-side error handler redirects to /signin.

### Logout

```
Browser                   BFF (SvelteKit)               Go API
  │  POST /auth/logout          │                           │
  │  X-CSRF-Token: <csrf>       │                           │
  │ ──────────────────────────► │                           │
  │                             │  POST /api/v1/auth/logout │
  │                             │  { refresh_token }        │
  │                             │ ─────────────────────────►│
  │                             │  204 (best-effort revoke) │
  │                             │ ◄─────────────────────────│
  │                             │  clears all 3 cookies     │
  │  200 { ok: true }           │                           │
  │ ◄──────────────────────────┤                           │
```

Logout clears cookies regardless of whether Go's revoke call succeeds —
the cookie deletion is the primary security action.

---

## Server-to-Server Auth (BFF → Go)

For v0.5: the BFF extracts the JWT from `__Host-lk_access` cookie and
forwards it verbatim as `Authorization: Bearer <jwt>` to Go. No additional
service-to-service credential is used.

Go's existing auth middleware (`RequireAuth`) accepts this without modification.
The JWT's claims (tenant_id, membership_id, permissions) are unchanged —
Go's authorization logic is unaffected.

**Future consideration:** for strict zero-trust deployments, the BFF ↔ Go
leg can be upgraded to mTLS or a separate service credential (API key) so
Go can reject calls that didn't originate from the BFF. This is out of scope
for v0.5.

---

## Deployment Topology

**Same-origin assumption (v0.5):**

```
[Client Browser]
       │ HTTPS
       ▼
[Reverse proxy: nginx / Caddy]
  ├── / → SvelteKit Node BFF  (port 3000)
  └── /  (upstream)  ← BFF calls this internally
                         Go API (port 8080, not public)
```

Browser only ever talks to the SvelteKit BFF origin. Go is not reachable from
the browser — it is behind the reverse proxy or in the same K8s pod. No
cross-origin CORS concerns for the BFF ↔ Go leg.

**Environment variable:** `GO_API_URL=http://localhost:8080` (dev).
Production sets this via the deployment environment.

---

## Dev Mode Note

`secure: true` on cookies requires HTTPS. In Vite dev (`npm run dev`), the
server is HTTP. The BFF reads `$env/static/private NODE_ENV` and sets
`secure: false` when `NODE_ENV !== 'production'` so dev cookies work over
HTTP. This flag is **never** relaxed in production builds.

---

## Failure Modes

| Scenario                               | BFF Response                                                | Client Behaviour                                                                      |
| -------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Go is down / unreachable               | 502 Bad Gateway                                             | API client throws `NetworkError`; toast "connection error"                            |
| `__Host-lk_access` cookie missing      | BFF redirects to `/signin` (from `+layout.server.ts` guard) | User lands at sign-in                                                                 |
| CSRF token missing / mismatch          | 403 `csrf_mismatch`                                         | API client throws `AuthError`; component shows error                                  |
| Access token expired, refresh succeeds | Transparent — BFF rotates cookies + retries                 | User sees no interruption                                                             |
| Access token expired, refresh fails    | BFF clears cookies + returns 401                            | API client throws `AuthError`; session store calls `window.location.href = '/signin'` |
| Refresh token expired (30-day TTL)     | Same as refresh-fails path                                  | Re-login required                                                                     |
| SSR load fails (capabilities 500)      | `+layout.server.ts` redirects to `/signin`                  | User must re-login                                                                    |

---

## What Changed vs. Previous SPA Model

| Concern               | Before                                     | After                                               |
| --------------------- | ------------------------------------------ | --------------------------------------------------- |
| Token storage         | `localStorage` (`leadkart-session` key)    | httpOnly cookies                                    |
| Token exposure        | JS-readable (XSS risk)                     | Opaque to JS                                        |
| Auth header injection | Client-side (`api/client.ts` hooks)        | BFF server-side                                     |
| 401 refresh           | Client-side (`api/client.ts` refresh loop) | BFF proxy layer                                     |
| Session bootstrap     | Client-side JWT decode + localStorage      | SSR `+layout.server.ts` → `$page.data.capabilities` |
| Adapter               | `adapter-static` (CDN deploy)              | `adapter-node` (Node server)                        |

---

## Files Involved

| File                                             | Role                                                     |
| ------------------------------------------------ | -------------------------------------------------------- |
| `src/routes/api/[...path]/+server.ts`            | Transparent BFF proxy; CSRF check; auto-refresh          |
| `src/routes/auth/login/+server.ts`               | Login → sets cookies                                     |
| `src/routes/auth/logout/+server.ts`              | Logout → clears cookies                                  |
| `src/routes/(app)/+layout.server.ts`             | SSR auth guard + capabilities bootstrap                  |
| `src/lib/api/client.ts`                          | CSRF header injection; `credentials: 'same-origin'`      |
| `src/lib/features/auth/stores/session.svelte.ts` | Derived from `$page.data.capabilities` — no localStorage |
| `src/lib/features/auth/queries.ts`               | `myCapabilitiesQuery` seeded with SSR `initialData`      |
