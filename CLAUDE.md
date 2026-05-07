# LeadKart Web — Project Context

> Read this first. Then read README.md + the layout map below.

## What this is

The Svelte SPA frontend for LeadKart's pharma SaaS. Targets the `leadkart-go` JSON API. NOT a Blazor port — fresh build per Phase 0 decision (Svelte chosen over Blazor for cost + dashboard responsiveness).

## Hard architectural rules

1. **Industry-canonical SvelteKit 2 layout.** Feature-first under `lib/features/`. Cross-feature primitives under `lib/components/{ui,form,feedback,data}/`. Layout shell under `lib/layouts/`. Route groups `(auth)` and `(app)` for layout-different sections. NEVER type-first dumps like `lib/components/{common,layout-components,...}/`.
2. **Pure SPA via adapter-static.** No SSR. No server endpoints. The leadkart-go API is the backend; this repo ships static assets to a CDN.
3. **TypeScript everywhere.** No `.js` source except generated types and config files.
4. **Svelte 5 runes only.** `$state`, `$props`, `$derived`, `$effect`. Stores in `*.svelte.ts` files (canonical extension). No legacy `writable()` unless absolutely needed for a third-party integration.
5. **One icon library.** lucide-svelte. No remixicon, boxicons, line-awesome — they bloat the bundle.
6. **API calls via typed feature wrappers.** Components NEVER call `fetch` directly. Always go through `lib/features/<x>/api.ts` which uses `lib/api/client.ts`.

## Where to find things

| What | Where |
|------|-------|
| API client + error types | `src/lib/api/{client,errors}.ts` |
| Auth feature (login, refresh, session store) | `src/lib/features/auth/` |
| Layout shell (Topbar / Sidebar / Footer / AppShell / AuthShell) | `src/lib/layouts/` |
| UI primitives (Button, Card, Input, …) | `src/lib/components/ui/` (TODO — to be populated as needs arise) |
| Form fields | `src/lib/components/form/` (TODO) |
| Global runes (theme, toast) | `src/lib/stores/*.svelte.ts` |
| i18n setup + locales | `src/lib/i18n/` |
| Tailwind utility (`cn`) | `src/lib/utils/cn.ts` |
| Auth route group | `src/routes/(auth)/` |
| Signed-in app group | `src/routes/(app)/` (auth-guarded by `+layout.ts`) |

## Stack versions (locked to latest stable Q1 2026)

- Svelte 5
- SvelteKit 2.16+
- Tailwind 4
- Vite 6
- TypeScript 5
- Node 22+

## Testing

- **Unit:** Vitest + @testing-library/svelte. Tests under `tests/unit/` or co-located `*.test.ts`.
- **E2E:** Playwright. Tests under `tests/e2e/`. CI runs `npm run build && npm run test:e2e`.

## Banned

- Multiple icon libraries
- Hand-rolled fetch in components (use feature API wrappers)
- Demo-data components (CartList, ProjectHead, fake User profiles) — strip on import from any third-party theme
- Type-first folder organization (`lib/components/common/`, `lib/components/layout-components/`)
- Mixing svelte-i18n setup with route files — keep in `lib/i18n/`
- SSR — adapter-static only

## Backend integration

Dev: vite proxies `/api/*` → `http://localhost:8080`. Production: set `PUBLIC_API_BASE_URL` build-time.

Auth flow:
1. POST /api/v1/auth/login → `{access_token, refresh_token, ...}`
2. Token persisted to localStorage; injected on every authenticated request via `lib/features/auth/stores/session.svelte.ts` + `setTokenGetter` in `lib/api/client.ts`.
3. (Future) 401 → silent refresh interceptor → retry original request.

## Roadmap

| Version | Scope | Backend dep |
|---|---|---|
| v0.1 | Auth flow (signin / signup / forgot / reset / verify) + dashboard placeholder + AppShell | leadkart-go Identity (already shipped) |
| v0.2 | Theme components — UI primitives populated from Domiex theme cherry-picks (Button, Card, Input, Modal, Drawer, Tabs, Tooltip, Badge, Alert, Toast, Pagination, Spinner) | — |
| v0.3 | Tenant + User management screens | leadkart-go Identity (shipped) |
| v0.4 | Platform module UI — marketplace + lead credits | leadkart-go Platform (planned) |
| v0.5 | CRM UI — lead conversion, call logs, reminders, hierarchy-scoped lists | leadkart-go CRM (planned) |
| ... | per-module UIs | per-module backend |
