# Phase 1c work list (from the Phase 1 final review, 2026-11-18)

Source: whole-branch review of `feat/kit3-hardening` (Phase 1a Kit 3 migration + Phase 1b BFF hardening). These items were found or confirmed during review and deliberately left out of Phase 1b. Each becomes a task in the Phase 1c plan. Spec reference: `docs/superpowers/specs/2026-11-18-platform-upgrade-ui-foundation-design.md` §4.2–§4.4.

## Ordered work list

| #   | Item                                                                                                                                                                                                                                                                                                                   | Area          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | Forward the client IP (`event.getClientAddress()`) and `User-Agent` to Go on proxy, login, refresh and reset calls; document `ADDRESS_HEADER` / `XFF_DEPTH`. Without this, any per-IP rate limit in Go is global and every session shows "Unknown device". Needs the backend to trust these headers only from the BFF. | BFF + backend |
| 2   | One `goAuthFetch` helper for the pre-login Go calls (timeout, `redirect: 'manual'`, `jsonError`); delete the dead duplicate routes `/auth/login`, `/auth/request-password-reset`, `/auth/reset-password` and their gateways (the form actions replaced them).                                                          | BFF           |
| 3   | Remove remaining duplicates: the `lk_csrf` cookie reader (`features/auth/api.ts` vs `lib/api/csrf.ts`), `GoErrorBody` (defined three times), the JWT-to-id helpers (three copies).                                                                                                                                     | BFF           |
| 4   | Server guards for `/leads`, `/orders`, `/inventory`, `/permission-requests` and tenant settings (load and the five actions). Blocked on permission strings from the owner / backend catalogue.                                                                                                                         | BFF           |
| 5   | Bind the operator-scope cookie to the caller's `person_id`.                                                                                                                                                                                                                                                            | BFF           |
| 6   | Impersonation BFF route: keep the scoped JWT in an httpOnly cookie so impersonation writes work (today the token is stripped and unused).                                                                                                                                                                              | BFF + feature |
| 7   | Preferences SSR plumbing (`lk_ui` cookie, `%lk.html.attrs%`); deletes the inline theme script. Leads into Phase 2.                                                                                                                                                                                                     | BFF + UI      |
| 8   | Typed errors: `SchemaError extends ApiError` (replaces the plain `Error` from `parseResponse`), `RateLimitError` (429), `ValidationError` keeps `detail` and falls back to a banner when `fields` is empty.                                                                                                            | Data layer    |
| 9   | Client request timeout and `signal` forwarded in every `queryFn`.                                                                                                                                                                                                                                                      | Data layer    |
| 10  | Cache coherence: `setQueryData(detail, dto)` on every mutation success (rule 11), bulk actions invalidate details, one users-detail key instead of `['me','profile']` + `['users','detail']`.                                                                                                                          | Data layer    |
| 11  | Remove the double error toasts (local `onError` + global handler) on ~14 mutations; `useUrlFilters.setMany` so saved views apply every key.                                                                                                                                                                            | Data layer    |
| 12  | Identity schemas derived from the generated `openapi-zod` (`joined_at` drift, password min length), users list cursor paging (`has_more` / `next_cursor`).                                                                                                                                                             | Data layer    |
| 13  | Money as integer paise; date-only values parsed as local dates.                                                                                                                                                                                                                                                        | Data layer    |
| 14  | CI: top-level `permissions: contents: read`, actions pinned to SHAs, `npm ci`, `npm audit` without `--omit=dev`, knip failing the build (today `\|\| true`), `openapi:check`, Storybook build, per-glob coverage thresholds (`lib/server/**` 90 %, view-models 95 %), `@testing-library/svelte`.                       | CI            |
| 15  | `visual-refresh.yml` → `workflow_dispatch` only, opens a PR, never pushes; generate Linux visual baselines in CI.                                                                                                                                                                                                      | CI            |
| 16  | Test-infra minors: mock-server `times` on wildcard fixtures; RFC-valid UUIDs in visual fixtures; replace the remaining `networkidle` waits.                                                                                                                                                                            | Tests         |
| 17  | Rewrite `CLAUDE.md` to match reality (adapter-node BFF, cookie auth, Kit 3 / `#lib`, `@lucide/svelte`, factory stores, real e2e matrix and budgets, reuse-first rule, updated library doctrine).                                                                                                                       | Docs          |
| 18  | Service worker policy: decide whether offline navigation should store full authenticated HTML (today it does, cleared on logout / auth pages / scope change) or only an app shell.                                                                                                                                     | PWA           |

## Deferred to Phase 2 / 3 (UI work)

- a11y Playwright project: 14 of 23 tests fail (headings, landmarks, skip link). The shell rebuild fixes this class.
- Navigation filtered by permission, not only by tier.
- Per-request SSR locale (Hindi users see an English → Hindi text flash on hard loads).
- `config.alias` deprecation → `package.json` `imports`; Storybook `Kanban.stories` `defineMeta` error; shadcn CLI `#lib` alias check; five CSS optimizer warnings.
- `settings/roles/[id]/+page.svelte` is at the 300-line budget; extract the parent picker.
- Tenant slug in the URL bar (`PersonDetail` → `/operator/tenants?q=slug`), person and membership ids in detail URLs (rule 10).

## Open questions for the owner

1. Permission strings for `/leads`, `/orders`, `/inventory`, `/permission-requests` and tenant settings.
2. Avatar initials: single-word names now show one letter (were two). Keep or revert?
3. Offline policy for authenticated pages (item 18).
