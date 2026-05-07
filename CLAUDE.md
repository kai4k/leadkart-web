# LeadKart Web — Project Context

> Read this first. Then read README.md + the layout map below.

## What this is

The Svelte SPA frontend for LeadKart's pharma SaaS. Targets the `leadkart-go` JSON API. NOT a Blazor port — fresh build per Phase 0 decision (Svelte chosen over Blazor for cost + dashboard responsiveness).

## Hard architectural rules

1. **Industry-canonical SvelteKit 2 layout.** Feature-first under `lib/features/`. Cross-feature primitives under `lib/components/{ui,form,feedback,data}/`. Layout shell under `lib/layouts/`. Route groups `(auth)` and `(app)` for layout-different sections. NEVER type-first dumps like `lib/components/{common,layout-components,...}/`.
2. **Pure SPA via adapter-static.** No SSR. No server endpoints. The leadkart-go API is the backend; this repo ships static assets to a CDN.
3. **TypeScript everywhere.** No `.js` source except generated types and config files.
4. **Svelte 5 runes only.** `$state`, `$props`, `$derived`, `$effect`, `$bindable`. Stores in `*.svelte.ts` files (canonical extension), CLASS-based with `$state` fields (not module-level `let foo = $state(...)` — that pattern silently breaks reactivity across module boundaries).
5. **One icon library.** lucide-svelte via `$icons` registry. No remixicon, boxicons, line-awesome — they bloat the bundle.
6. **API calls via typed feature wrappers.** Components NEVER call `fetch` directly. Always go through `lib/features/<x>/api.ts` which uses `lib/api/client.ts`.
7. **Design tokens are the only source of truth for visual decisions.** Components consume `var(--color-bg-elevated)` / Tailwind utilities tied to tokens — NEVER inline hex / RGB / oklch literals at the call site. Tokens live in `src/styles/tokens.css`; surfacing a new colour requires adding a token.
8. **Per-route `+error.svelte` for every route group.** Svelte has no JavaScript-style error boundaries; an unhandled error climbs to the nearest `+error.svelte`. Each route group (`(auth)`, `(app)`, future `(marketing)` etc.) ships its own so error UI matches the surrounding layout.

## Architectural pattern — Gateway → Service → ViewModel → Component

Per Niko Heikkilä "Clean Frontend Architecture with SvelteKit" + Strapi SOLID + the parallel TDL Wild Workouts pattern enforced on the Go side.

```
┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  ┌─────────────┐
│   API GATEWAY    │  │     SERVICE      │  │   VIEW MODEL  │  │  COMPONENT  │
│  (lib/api/+      │→ │  (lib/features/  │→ │  (transform   │→ │  (renders   │
│   features/<x>/  │  │   <x>/service.ts)│  │   for display)│  │   VM)       │
│   api.ts)        │  │                  │  │               │  │             │
└──────────────────┘  └──────────────────┘  └───────────────┘  └─────────────┘
   raw HTTP +            business logic        DTO → display       dumb,
   schema validate       (orchestration,       shape transform     agnostic,
   at boundary           state mutation,                           composes
                         retry, refresh)                           primitives
```

**Layer rules:**

| Layer                                         | Owns                                                                     | Imports             | Bans                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------ |
| Gateway (`api.ts`)                            | HTTP shape, status mapping, Zod-parse the response                       | `$api/client`       | NO business logic; NO state mutation                         |
| Service (`service.ts` or `*.svelte.ts` store) | Orchestration, multi-step flows, state mutation, retry/refresh decisions | gateway, stores     | NO direct fetch; NO DOM access                               |
| ViewModel (`view-models.ts`)                  | Pure functions transforming DTOs into render-ready shapes                | none (pure)         | NO async; NO side effects                                    |
| Component (`*.svelte`)                        | Render the VM; emit user events; compose primitives                      | service, primitives | NO `fetch`; NO direct API DTO consumption; NO business logic |

When does a feature need a separate `service.ts`? When the component would otherwise contain logic beyond "call gateway, set state". Example: `auth/stores/session.svelte.ts` IS the auth service today (state + persistence + auth-hook wiring). When that hits 3+ orthogonal concerns, split it per the Rule of Three below.

## Rule of Three — anti-premature-abstraction gate

Per Strapi SOLID guide + standard YAGNI canon: **only extract a shared abstraction after THREE concrete implementations demonstrate the pattern naturally.**

Applies to:

- Generic utilities (extract once 3 callers shadow each other).
- Service layer split (extract a Service class once a store grows past 3 mixed concerns).
- Component primitives (extract once 3 features need the same shape).
- Schema patterns (extract once 3 schemas share validators).

The cost of premature abstraction (rigid scaffolding, mock layers, refactor burden) outweighs the cost of one duplication. Two similar things stay duplicated; the third is the trigger.

## SOLID conformance signals (audit grep targets)

| Principle | Anti-pattern grep                               | Fix                                         |
| --------- | ----------------------------------------------- | ------------------------------------------- |
| **SRP**   | Class file >300 LOC with mixed concerns         | Split per concern                           |
| **OCP**   | `switch` / `if-else` ladder on stable type enum | Strategy via `cva` variants OR keyed config |
| **LSP**   | `instanceof` checks before method calls         | Refactor base type's contract               |
| **ISP**   | Interface with >5 methods, clients use 1-2      | Split into per-use-case interfaces          |
| **DIP**   | `new ConcreteService()` in component / handler  | Inject via store / props / hooks            |

Today's codebase is SOLID-clean per `docs/audit-pass.md` (the deep-audit summary committed in `refactor/audit-fixes`). New code must keep it that way.

## Where to find things

| What                                                                       | Where                                                                                                                                   |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Design tokens                                                              | `src/styles/tokens.css` (the ONLY place colours / type / spacing / motion / radius / shadow / z-index / icon-size / fluid spacing live) |
| Global stylesheets                                                         | `src/styles/{tokens,base,typography,layout,animations,utilities}.css`                                                                   |
| API client + error types                                                   | `src/lib/api/{client,errors}.ts`                                                                                                        |
| Auth feature (login, refresh, session store)                               | `src/lib/features/auth/` (api.ts gateway, schemas.ts Zod, stores/session.svelte.ts service)                                             |
| Layout shell (Topbar / Sidebar / Footer / AppShell / AuthShell / UserMenu) | `src/lib/layouts/`                                                                                                                      |
| UI primitives (Button, Alert, Spinner, Card.\* composition)                | `src/lib/components/ui/`                                                                                                                |
| Form fields (TextField, PasswordField)                                     | `src/lib/components/form/`                                                                                                              |
| Icon registry + sized wrapper                                              | `src/lib/icons/`                                                                                                                        |
| Global runes (theme)                                                       | `src/lib/stores/*.svelte.ts`                                                                                                            |
| i18n setup + locales                                                       | `src/lib/i18n/`                                                                                                                         |
| Tailwind utility (`cn`)                                                    | `src/lib/utils/cn.ts`                                                                                                                   |
| Sidebar nav config (RBAC-ready)                                            | `src/lib/config/nav.ts`                                                                                                                 |
| Auth route group                                                           | `src/routes/(auth)/` (signin + +error.svelte)                                                                                           |
| Signed-in app group                                                        | `src/routes/(app)/` (auth-guarded by `+layout.ts`, +error.svelte for layout-aware errors)                                               |

## Stack versions (locked to latest stable Q1 2026)

- Svelte 5
- SvelteKit 2.59+
- Tailwind 4
- Vite 8
- TypeScript 6
- Vitest 4
- ESLint 10
- Node 22+

All deps tracked at LATEST via Dependabot (see `.github/dependabot.yml` — weekly grouped PRs).

## CI gates (every PR must pass)

- `npm run lint` — prettier + ESLint
- `npm run check` — svelte-check + tsc
- `npm run test:coverage` — vitest run with coverage thresholds
- `npm run build` — adapter-static
- `npx size-limit` — bundle ≤ 350 KB JS gzip / ≤ 60 KB CSS gzip / ≤ 60 KB initial route gzip
- `npm audit --audit-level=high` — block on high+ CVEs
- `npm run test:e2e` — Playwright across chromium / firefox / webkit
- a11y — axe-core asserts zero serious/critical WCAG 2.2 AA violations on every page tested

## Testing

- **Unit:** Vitest + @testing-library/svelte. Tests under `tests/unit/` or co-located `*.test.ts`.
- **E2E:** Playwright matrix (chromium / firefox / webkit) under `tests/e2e/`. CI runs build → preview → matrix.
- **A11y:** `@axe-core/playwright` integrated into e2e suite — every new route adds an a11y assertion.

## Banned

- Multiple icon libraries
- Hand-rolled fetch in components (use feature API wrappers)
- Demo-data components (CartList, ProjectHead, fake User profiles) — strip on import from any third-party theme
- Type-first folder organization (`lib/components/common/`, `lib/components/layout-components/`)
- Mixing svelte-i18n setup with route files — keep in `lib/i18n/`
- SSR — adapter-static only
- Inline hex / RGB / oklch literals — every colour is a design token
- Module-level `$state` + function accessors (breaks cross-module reactivity — use class-based stores)
- `focus:` ring without `focus-visible:` (focus rings on click are a11y noise)
- `fetch()` in components or services — must go through gateway layer
- Premature abstraction — Rule of Three gates extractions

## Backend integration

Dev: vite proxies `/api/*` → `http://localhost:8080`. Production: set `PUBLIC_API_BASE_URL` build-time.

Auth flow:

1. POST /api/v1/auth/login → `{access_token, refresh_token, person_id, tenant_id, membership_id, ...}` (Zod-validated at gateway boundary)
2. Token + principal persisted to localStorage; injected on every authenticated request via `setAuthHooks` callbacks in `lib/api/client.ts`
3. 401 → silent refresh + ONE retry; refresh failure clears session + emits REFRESH_FAILED → caller redirects to /signin
4. FOUC prevented by inline blocking script in `app.html` reading `localStorage['leadkart-theme']` synchronously before first paint

## Roadmap

| Version | Scope                                                                                                                                                                                               | Backend dep                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| v0.1    | Auth flow (signin / signup / forgot / reset / verify) + dashboard placeholder + AppShell                                                                                                            | leadkart-go Identity (already shipped) |
| v0.2    | Theme components — UI primitives populated from Domiex theme cherry-picks (Modal, Drawer, Tabs, Tooltip, Badge, Toast, Pagination — Button/Card/Alert/Spinner/TextField/PasswordField already done) | —                                      |
| v0.3    | Tenant + User management screens                                                                                                                                                                    | leadkart-go Identity (shipped)         |
| v0.4    | Platform module UI — marketplace + lead credits                                                                                                                                                     | leadkart-go Platform (planned)         |
| v0.5    | CRM UI — lead conversion, call logs, reminders, hierarchy-scoped lists                                                                                                                              | leadkart-go CRM (planned)              |
| …       | per-module UIs                                                                                                                                                                                      | per-module backend                     |
