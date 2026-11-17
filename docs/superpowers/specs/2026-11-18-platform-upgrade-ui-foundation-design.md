# Platform upgrade + UI foundation — design

**Date:** 2026-11-18 · **Status:** decisions locked with owner · **Supersedes:** the stack sections of `2026-05-26-ui-canon-rebuild.md` (its testing layers A–F stay in force) and the "Component library doctrine" table in `CLAUDE.md`.

## 1. Why

The 2026-11-17 review found four classes of problem:

1. **Broken core:** silent refresh can never work, the proxy is open to path traversal, there's an open redirect, a missing Tooltip provider crashes `/settings/roles/[id]`, and order actions can hit the wrong order. Full list in §4.2.
2. **Stack drift:** SvelteKit 3 shipped on 2026-10-01; `lucide-svelte` is deprecated; vaul-svelte is abandoned; 22 dead shadcn folders (1,631 LOC); two colour-token systems define `--color-primary` / `--color-border` twice.
3. **Duplication:** the same pattern is hand-built repeatedly (six reason dialogs, nine copies of field label/hint/error markup, 14 raw textareas, six hand-rolled tables, three copies of the error mapping). See §6.
4. **Incomplete pages:** see §7.

## 2. Locked decisions

| #   | Decision                                                                              | Rationale                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Migrate to SvelteKit 3.3**                                                          | Current major. No dependency blocks it (audit 2026-11-18).                                                                                                                                                                               |
| D2  | **Keep bits-ui, adopt shadcn-svelte properly** (CLI-regenerated, copy-in, owned code) | Live npm 2026-11-18: bits-ui 1.82M/wk + shadcn-svelte 322K/wk ≈ 70–80% of headless Svelte usage. Next active options: Zag 116K, Skeleton 73K, Ark 31K. The bus-factor risk is bounded because only `lib/components/ui/` imports bits-ui. |
| D3  | **Desktop-first performance**                                                         | Smooth large tables and instant dialogs come first; bundle size is secondary (informational budget only).                                                                                                                                |
| D4  | **Light + dark + auto**                                                               | Matches Domiex.                                                                                                                                                                                                                          |
| D5  | **Full Domiex customizer, LTR only**                                                  | Every axis is CSS-driven via `<html data-*>` attributes. The RTL-safety gate stays so RTL remains cheap later.                                                                                                                           |
| D6  | **Preferences persisted in a cookie, rendered at SSR**                                | No flash of the wrong theme and no backend work. Storage sits behind an interface so server-side persistence (per-user or tenant default) can be added later.                                                                            |
| D7  | **Reuse first**                                                                       | A second similar occurrence triggers extraction into a shared component. This is stricter than CLAUDE.md's Rule of Three, which waits for the third.                                                                                     |
| D8  | **One library per concern**                                                           | See §3.                                                                                                                                                                                                                                  |

## 3. Stack

| Concern            | Library (version on 2026-11-18)                                              | Change                              |
| ------------------ | ---------------------------------------------------------------------------- | ----------------------------------- |
| Framework          | @sveltejs/kit 3.3, svelte ≥5.57.1, adapter-node 6, vite 8, TS 6, Node ≥22.17 | upgrade                             |
| Headless           | bits-ui 2.21. Imported **only** from `lib/components/ui/**` (new arch gate). | bump                                |
| Styled layer       | shadcn-svelte CLI 1.8 → `lib/components/ui/`                                 | regenerate                          |
| Forms              | sveltekit-superforms 3.1 + formsnap 2.1 + zod 4                              | adopt (currently unused)            |
| Tables             | @tanstack/svelte-table 9 + virtua                                            | add                                 |
| Charts             | layerchart 2.11 (shadcn `chart`)                                             | add                                 |
| Toast              | svelte-sonner 1.2                                                            | keep                                |
| Icons              | @lucide/svelte 1.74 via the `$icons` registry                                | replaces deprecated `lucide-svelte` |
| Variants / classes | cva + clsx + tailwind-merge (`cn`)                                           | keep                                |
| Data fetching      | @tanstack/svelte-query 6                                                     | keep                                |
| Animation          | tw-animate-css                                                               | keep                                |
| i18n               | svelte-i18n                                                                  | keep                                |

**Removed:**

- vaul-svelte: desktop sheets use shadcn `Sheet` on bits-ui Dialog.
- mode-watcher: the preferences service owns mode.
- lucide-svelte.
- @sveltejs/adapter-auto.
- @storybook/addon-essentials@8: merged into Storybook 10 core.
- GlassSurface / Svelte Bits: removed from doctrine; never installed. Reasons: Chromium-only filter, `rgba` literals, Commons Clause licence.
- 22 dead `ui/` folders.

## 4. Phase 1 — Kit 3 + hardening (sub-project 1)

### 4.1 Kit 3 migration (official guide: svelte.dev/docs/kit/migrating-to-sveltekit-3)

Order:

1. Bump to the latest Kit 2.x, svelte ≥5.57.1, svelte-check ≥4.7.6, eslint-plugin-svelte ≥3.23.1. Collect deprecation warnings.
2. Run `npx sv migrate sveltekit-3`.
3. Move `svelte.config.js` options into `sveltekit({...})` in `vite.config.ts`. Fix the `eslint.config.js` import. Make `tsconfig.json` extend `$app/tsconfig` with an explicit include/exclude.
4. Bump adapter-node 6, superforms 3, formsnap 2.1. Drop adapter-auto.
5. Change `$lib` → `#lib` with explicit extensions (336 imports, 251 files). Custom aliases (`$ui`, `$features`, `$api`, `$icons`, `$form`, `$layouts`) are deprecated but not removed: keep them for now, and move them to package.json `imports` in a separate later commit.
6. Manual changes:
   - `resolve()` drops the leading `/` for pathnames (57 calls); `Pathname` becomes `Path`.
   - `goto` option renames (~18 files).
   - `invalidateAll` becomes `refreshAll`.
   - `$app/environment` becomes `$app/env`; `$env/*` becomes `$app/env/{private,public}`.
   - The service worker loses `$service-worker`.
   - `Cookies`/`RequestEvent` move to `$app/server`.
   - `json()` becomes `Response.json()`.
   - `handleError` now receives `error()` errors, so return `status`.
7. Tooling: vitest aliases and stubs (`$app/env`), dependency-cruiser resolver, knip, `components.json`, `scripts/arch/*`.
8. Verify: full gate set, Storybook smoke test, new size-limit baseline (adapter-node now bundles with rolldown).

### 4.2 Security + correctness fixes (P0/P1 from review)

| Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Where                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Refresh flow:<br>• new `/auth/refresh` endpoint<br>• proxy and `(app)` layout call it<br>• logout receives the refresh token<br>• `lk_csrf` lifetime = refresh lifetime<br>• single-flight refresh per token (keyed by `sha256(refresh)`, 10 s TTL)<br>• clear `lk_op_tenant` on refresh failure and on login                                                                                                                                                                                                                                                         | `lib/server/{cookies,auth-refresh}.ts`, `routes/auth/refresh/+server.ts`, proxy, `(app)/+layout.server.ts`, logout |
| Proxy path safety:<br>• reject `.`/`..` segments and segments containing `/ \ ? #`<br>• require a `v1/` prefix<br>• assert the final `pathname` starts with `/api/v1/`                                                                                                                                                                                                                                                                                                                                                                                                | `routes/api/[...path]/+server.ts`                                                                                  |
| Token-bearing paths are not proxied: `v1/auth/*` and `v1/platform/impersonation/sessions` POST. Impersonation gets its own BFF route that moves the scoped JWT into an httpOnly cookie.                                                                                                                                                                                                                                                                                                                                                                               | proxy + `routes/api/operator/impersonation/+server.ts`                                                             |
| `safeRedirectPath(raw, origin)` helper using `new URL` with an origin compare; used by signin and must-change-password; `encodeURIComponent` when forwarding                                                                                                                                                                                                                                                                                                                                                                                                          | `lib/server/redirect.ts`                                                                                           |
| `hooks.server.ts` `handle`:<br>• HSTS (prod), `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`<br>• `kit.csp` in `auto` mode<br>• preferences SSR plumbing (§5.3): the `lk_ui` cookie, the `PreferencesStorage` interface and `%lk.html.attrs%` injection, shipped in Phase 1 for the **existing** axes (primary, content width, sidebar collapsed). This lets the inline FOUC script and the localStorage keys be deleted, which unblocks the strict CSP. Phase 2 only adds the new axes to the schema.<br>• `must_change_password` enforcement | `src/hooks.server.ts`                                                                                              |
| Config fails closed:<br>• secure cookies unless `NODE_ENV=development` explicitly<br>• in production, require `ORIGIN` with `https:`<br>• document `ORIGIN` / `PROTOCOL_HEADER` in `.env.example`                                                                                                                                                                                                                                                                                                                                                                     | `lib/server/config.ts`                                                                                             |
| Upstream calls use `AbortSignal.any([req.signal, AbortSignal.timeout(10_000)])`; a timeout maps to 504                                                                                                                                                                                                                                                                                                                                                                                                                                                                | proxy, `go.ts`, layout loads                                                                                       |
| Scope cookie: UUID-validated, HMAC-signed (`SCOPE_COOKIE_SECRET`), bound to `person_id`                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `lib/server/scope.ts`                                                                                              |
| Proxy response:<br>• header allowlist (`content-type`, `retry-after`, `etag`, `content-disposition`, `location`)<br>• `cache-control: no-store`<br>• stream `upstream.body`                                                                                                                                                                                                                                                                                                                                                                                           | proxy                                                                                                              |
| Zod-parse token and login responses                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | login / refresh / signin                                                                                           |
| Client: a global `AuthError` 401 redirects once to `/signin?next=`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `lib/api/query-client.ts`                                                                                          |
| Server-side `requireCapability(event, cap)` replaces the 8 client `$effect + goto` guards; `/leads`, `/orders`, `/inventory`, `/permission-requests`, tenant settings gain guards                                                                                                                                                                                                                                                                                                                                                                                     | `lib/server/guards.ts` + `+layout.server.ts` / `+page.server.ts`                                                   |
| Order actions get the id in mutation variables plus `{#key id}` on the detail route                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `features/orders/**`, `routes/(app)/orders/[id]`                                                                   |
| `roles/new` guard uses `identity.roles.create`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | route                                                                                                              |
| Typed errors:<br>• `ValidationError` keeps `detail` (falls back to a banner when `fields` is empty)<br>• `SchemaError extends ApiError` replaces plain `Error` in `parseResponse`<br>• add `RateLimitError` (429)                                                                                                                                                                                                                                                                                                                                                     | `lib/api/{errors,client}.ts`                                                                                       |
| Remove the double toasts: a local `onError` toast gets `meta.skipErrorToast` or is deleted                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | orders / leads / scope queries                                                                                     |
| `useUrlFilters.setMany(patch)` makes a single `goto`; `useSavedViews.activate` uses it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `lib/hooks`                                                                                                        |
| Identity schemas derive from generated `openapi-zod` (`.pick` / `.extend`); the users list gets cursor paging (`has_more` / `next_cursor`)                                                                                                                                                                                                                                                                                                                                                                                                                            | `features/{auth,users}/schemas.ts`, users api/queries                                                              |
| Money uses integer paise (`lib/utils/money.ts`); date-only values are parsed as local dates                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | orders / inventory view-models                                                                                     |
| Cache coherence:<br>• `onSuccess` calls `setQueryData(detail, dto)` everywhere (rule 11)<br>• bulk actions invalidate details<br>• one `['users','detail',id]` key replaces `['me','profile']`                                                                                                                                                                                                                                                                                                                                                                        | all `queries.ts`                                                                                                   |
| Pass `signal` to every `queryFn`; client request timeout                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `lib/api/client.ts`, `queries.ts`                                                                                  |

### 4.3 CI + tooling

- `ci.yml`: top-level `permissions: contents: read`; actions pinned to SHAs (kept current by Dependabot); `npm ci` instead of `npm install`; drop `--omit=dev` from `npm audit`.
- Move runtime packages (`@sveltejs/kit`, `svelte`) to `dependencies`.
- `visual-refresh.yml`: `workflow_dispatch` only; refuses `main`; opens a PR instead of pushing; job-level permissions; concurrency group.
- Generate visual baselines on Linux in CI and set `snapshotPathTemplate`.
- Mock server records headers; the X-Tenant-Id e2e test asserts the injected value and that a spoofed header is dropped.
- Unit tests for `lib/server/**`, the proxy, CSRF and refresh, with a per-glob coverage threshold of 90% for `lib/server/**` and 95% for `**/view-models.ts`. Install `@testing-library/svelte`.
- Knip fails CI; `openapi:check` runs in CI; `storybook build` runs in CI.

### 4.4 CLAUDE.md rewrite

Bring CLAUDE.md in line with reality:

- adapter-node BFF; SSR is allowed and used by the BFF.
- Cookie auth, not localStorage.
- No Vite `/api` proxy.
- Real size budgets and the real e2e matrix.
- Factory stores, not "class-based hooks".
- The §3 doctrine table.
- Rule D7, which replaces the Rule of Three for UI.
- Reuse catalogue pointer (§6).

## 5. Phase 2 — UI foundation (sub-project 2)

### 5.1 Token architecture: one semantic layer

There are three layers, and **only the semantic layer is consumed by components.**

1. **Palette (primitive):** oklch ramps `--palette-{leadkart,green,violet,orange,teal,fuchsia,lime,amber}-{50..950}` plus neutral ramps `--neutral-{default,zinc,stone,neutral,gray}-{50..950}`. Lives in `styles/theme/palettes.css`.
2. **Semantic: shadcn names**, so that CLI-regenerated components drop in with zero edits:
   - `--background`, `--foreground`, `--card(-foreground)`, `--popover(-foreground)`
   - `--primary(-foreground)`, `--secondary(-foreground)`, `--muted(-foreground)`, `--accent(-foreground)`, `--destructive(-foreground)`
   - `--border`, `--input`, `--ring`
   - `--chart-1..5`
   - `--sidebar`, `--sidebar-foreground`, `--sidebar-primary(-foreground)`, `--sidebar-accent(-foreground)`, `--sidebar-border`, `--sidebar-ring`
   - LeadKart extensions: `--success`, `--warning`, `--info` (each with `-foreground` and `-soft`) and `--primary-soft`
3. **Tailwind bridge:** an `@theme inline` block maps these to utilities (`bg-background`, `text-muted-foreground`, …).

**Mode without JS, using `light-dark()`.** Each semantic colour is declared once, for example `--background: light-dark(var(--surface-light-bg), var(--surface-dark-bg))`. Mode is just the `color-scheme` value on `<html>`:

| `data-mode` | `color-scheme` |
| ----------- | -------------- |
| `light`     | `light`        |
| `dark`      | `dark`         |
| `auto`      | `light dark`   |

This means "auto" follows the OS with no JS and no flash. `light-dark()` has been Baseline since 2024, which is fine for desktop-first.

**`dark:` variant.** shadcn components use `dark:` classes, so a Tailwind 4 block custom variant matches both explicit dark and auto + OS dark:

```css
@custom-variant dark {
	&:where([data-mode='dark'], [data-mode='dark'] *) {
		@slot;
	}
	@media (prefers-color-scheme: dark) {
		&:where([data-mode='auto'], [data-mode='auto'] *) {
			@slot;
		}
	}
}
```

**Migration of the legacy Domiex-named tokens:**

- The `--color-bg-*`, `--color-fg-*`, `--color-brand-*` names are swept to the semantic names, then deleted.
- The `@theme` / `@theme inline` double definitions disappear.
- The look stays Domiex (values, spacing, radius, shadow). Only the variable names standardise.
- Non-colour tokens (spacing, type, radius, shadow, z-index, motion) are unchanged.

**Gates:**

- `check-tokens` is extended to fail on the legacy prefixes.
- `check-token-contrast` runs every **primary × mode × dark-palette** combination (8 × 2 × 5) for the text/background pairs.

### 5.2 Customizer axes

Every axis is a `data-*` attribute on `<html>` consumed by CSS. Changing one never re-renders a component, except for the single layout branch noted below.

| Axis           | Attribute             | Values (default first)                                                      | Implementation                                                                                                                                                     |
| -------------- | --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layout         | `data-layout`         | `vertical`, `horizontal`, `modern`, `boxed`, `semibox`                      | CSS for the 4 sidebar layouts. `horizontal` is the **only** structural branch: it swaps `Sidebar` for `HorizontalNav`.                                             |
| Nav type       | `data-nav-type`       | `default`, `floating`, `boxed`, `pattern`                                   | Topbar CSS                                                                                                                                                         |
| Content width  | `data-content-width`  | `default`, `fluid`                                                          | Container max-width (exists today)                                                                                                                                 |
| Sidebar size   | `data-sidebar`        | `large`, `medium`, `small`                                                  | Sidebar CSS. `small` = icon-only + tooltip; replaces today's `data-sidebar-collapsed`                                                                              |
| Mode           | `data-mode`           | `light`, `dark`, `auto`, `black-white`                                      | `color-scheme`. `black-white` = light + `filter: grayscale(1)` on the app root, not on `<html>`, so fixed positioning keeps working.                               |
| Primary colour | `data-colors`         | `leadkart`, `green`, `violet`, `orange`, `teal`, `fuchsia`, `lime`, `amber` | Remaps `--primary*`, `--ring`, `--chart-1`, `--sidebar-primary` to the chosen palette ramp. `leadkart` replaces Domiex's blue default and anchors the logo purple. |
| Sidebar colour | `data-sidebar-colors` | `light`, `dark`, `brand`, `purple`, `sky`                                   | Remaps `--sidebar*`                                                                                                                                                |
| Dark palette   | `data-dark-palette`   | `default`, `zinc`, `stone`, `neutral`, `gray`                               | Selects the `--surface-dark-*` neutral ramp                                                                                                                        |

**Mobile (below `lg`):** the sidebar always renders as a `Sheet` and the layout and sidebar-size axes are ignored. Desktop-first, but nothing breaks on mobile.

### 5.3 Preferences service: extends the existing theme store

This is a reuse, not a new build. `lib/hooks/use-theme.svelte.ts` and `layouts/SettingsModal.svelte` already implement two axes on data attributes. They become:

- **`lib/features/preferences/schema.ts`:** a Zod schema of all 8 axes with defaults. It is the single source of truth: types, the customizer config and SSR all read from it.
- **`lib/features/preferences/store.svelte.ts`:** a factory store (`createPreferences()`) with getters, `set(patch)` and `reset()`.
- **`PreferencesStorage` interface:** `{ read(): Prefs; write(p): void }`. v1 ships `cookieStorage`.
- **Cookie `lk_ui`:** base64url JSON; not httpOnly (the client writes it); `SameSite=Lax`; `Path=/`; 1-year lifetime; ≤ 300 bytes.
- **SSR:** `hooks.server.ts` parses the cookie with Zod (invalid → defaults) and `transformPageChunk` replaces `%lk.html.attrs%` in `app.html` with the 8 attributes.
  - The **inline FOUC script and the localStorage keys are deleted**, which unblocks a strict CSP (§4.2).
  - The client hydrates the store from `page.data.preferences`.
- **`ThemeCustomizer`** (replaces `SettingsModal`, same lazy-load in AppShell):
  - A right-side shadcn `Sheet`.
  - Groups are rendered from one keyed config array derived from the schema (OCP: adding an axis is a config entry, not markup).
  - Each group is a radio group of swatch/preview tiles.
  - Includes a "Reset" button.

### 5.4 Shell

- **`AppShell`** composes `Sidebar | HorizontalNav`, `Topbar`, `PageContainer`, `Footer`. Layout differences live in `styles/theme/layouts.css`.
- **`Sidebar`** is built on the **shadcn-svelte `sidebar`** block. It is the gold-standard block, with built-in collapsible-icon mode and keyboard shortcut, mapped to the `large`/`medium`/`small` sizes; we don't hand-roll a new one. Tier derivation moves out of the layout into `features/auth/capabilities`.
- **`HorizontalNav`** reuses the same `nav.ts` config and `NavItem` rendering as `Sidebar`. One nav model, two renderers.
- **`Topbar`:**
  - The breadcrumb renders as a `<span>`, so the page owns the single `<h1>` through `PageHeader`.
  - The Bell icon is hidden until notifications exist.
  - Nav-type styling is CSS-only.
- **`AuthShell`** (782 LOC) splits into `AuthShell` (frame), `AuthBrandPanel` and `AuthBackdrop`. The particle field stays (it is the brand moment) but uses tokens and the reduced-motion rule.
- The `Toaster` and `Tooltip.Provider` are mounted once in the root `+layout.svelte`, covering both auth and app.

### 5.5 Component layer

**`lib/components/ui/` (shadcn-svelte CLI, owned):**

- Regenerate this set: accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, checkbox, collapsible, command, dialog, dropdown-menu, form, input, label, pagination, popover, progress, radio-group, range-calendar, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip, chart.
- Everything else currently in `ui/` that isn't in this list and isn't a LeadKart composite gets deleted.
- Local edits are limited to classes and tokens. LeadKart-specific variants (for example Button `tonal`) are added via cva in the same file and listed in `ui/CUSTOMIZATIONS.md`, so a quarterly `shadcn-svelte add --overwrite` diff is cheap to replay.
- Fixes that come with regeneration: nested-button (bits-ui `child` snippet pattern everywhere), the Tooltip provider, focus rings, field ids via `$props.id()`, and alert `role` depending on variant.

**`lib/components/form/`:**

- The hand-rolled fields (`TextField`, `PasswordField`, `Select`, `Combobox`, `DatePicker`, `DateRangePicker`, `NumberInput`, `RadioGroup`, `Switch`, `TagInput`, `FileDropZone`) are rebuilt as thin **formsnap `Form.Field` + shadcn input** compositions.
- **Every form uses superforms.** Server actions for BFF routes; `SPA: true` + `zod4` adapter + `onUpdate → mutation` for TanStack mutations.
- formsnap's `Field` / `Control` / `Label` / `Description` / `FieldErrors` is the one label/hint/error wrapper; this replaces the 9 copies.
- `ValidationError.fields` map onto superforms errors; `detail` maps to a form-level `Alert`.

**`lib/components/data/` and `feedback/`:** the LeadKart composites in §6.

### 5.6 DataTable

One generic `DataTable` built on TanStack Table v9 (feature-registered, tree-shaken), following the shadcn data-table guide.

**Props:**

- `columns`, `data`, `getRowId`
- `selection` (none / single / multi), `sorting` (client | server), `pagination` (client | offset | cursor), `columnVisibility`
- `rowHref` (renders a primary-cell link, not a clickable `<tr>`)
- `stickyHeader`, `density`

**Behaviour:**

- `aria-sort` on sortable headers; an sr-only "Actions" header.
- Above 100 rows the body virtualises with virtua automatically.

**Replaces:** the hand-rolled `ui/data-table`, the `LeadsTable` fork and the 6 raw `<table>` sites.

**Performance target:** leads list with 1,000 rows. Scroll at 60 fps, sort in under 100 ms, row-selection INP under 100 ms. Measured with a Playwright trace in CI as informational.

## 6. Reuse catalogue: shared components and helpers

The full list is in [`2026-11-18-reuse-catalogue.md`](2026-11-18-reuse-catalogue.md): 23 shared pieces with their exact occurrences, 16 primitives that features bypass, and 14 copies whose behaviour has drifted. Together they come to about 2,900 LOC of duplication.

The top five, which cover 30+ files and about 1,850 LOC:

- **`FormSheet` / `FormDialog`:** forms inside a sheet or dialog, on superforms; reset on open; leave guard.
- **`ReasonConfirmDialog`:** confirm with a reason field, plus type-to-confirm.
- **`DataTable`:** TanStack v9.
- **`describeApiError`:** one helper for all error messages.
- **`QueryState`:** loading/error/empty states, with 404, 403 and network errors told apart.

**Phase 2 build order:**

1. Foundations: `utils/format`, `utils/status`, `describeApiError`, `api.postForm` / `getBlob`, shared page and bulk schemas, `createResourceMutation`.
2. Field layer: `TextareaField`.
3. `FormSheet` / `FormDialog` / `ActionForm` / `ReasonConfirmDialog`.
4. `QueryState`, `DescriptionList`, `DataTable`, `ResourceListPage` + `SearchInput` + `StatusChips`.
5. `SectionNav`, `RouteError`, `IdentityCell`, the small pieces, `useLeaveGuard`.
6. Migrate every listed occurrence, one feature per commit.

**Migration rule:** a Phase 2 commit that adds a shared piece also migrates all of its listed occurrences. That way no shared piece ships with zero users, which is how today's `StatCard` and `DatePicker` ended up unused.

## 7. Phase 3 — pages (sub-project 3)

Built **only** from §5/§6 components; any new pattern used twice gets extracted first (D7). Order:

1. **Dashboards:** wire tenant-admin and tenant-user tiles to the leads/orders/inventory gateways (`StatCard` + LayerChart). Remove the "Skeleton — v0.4" alert.
2. **`/orders/new`:** create-quotation flow, reusing `OrderItemsEditor` + `FormSheet`/page form.
3. **Leads:** single-lead create and a fixed bulk Reassign (shared `MembershipPicker` extracted from `ReassignDialog`).
4. **Operator scope:** `members/[id]` and `roles/[id]` inside the scope chrome (shared `UserDetailTabs` / role editor via a `detailHref` prop). Rule 10: person and membership ids move out of the URL bar.
5. **Reminders / today's callbacks page:** `listReminders` gateway exists.
6. **Orphan pages:** add the `/settings/account/activity` tab; add `/operator/persons` to `PLATFORM_NAV`.
7. **Inventory product Activity tab:** shared `ActivityFeed`.
8. **Role editor:** seed once per `role.id`; per-button pending state; `NumberInput`; error mapping via `describeApiError`; dirty-state leave guard (`beforeNavigate`) through a shared `useLeaveGuard` hook used by every editable form.
9. **i18n sweep:** every hardcoded English string in app routes and `nav.ts` moves to `en`/`hi` locale keys (the locale-parity gate already exists).

Out of scope here, each needing its own spec plus a backend dependency: signup/verify, platform marketplace and credits (v0.4), dispatch, tasks, notifications, invoices index, impersonation sessions list.

## 8. Testing

- **Unit:**
  - Vitest + @testing-library/svelte for every §6 composite.
  - `lib/server/**` at 90% coverage.
  - View-models at 95%.
- **Visual (pairwise, not cartesian):**
  - Every route at default preferences, in light and dark.
  - Plus one shot per non-default value of each axis on 3 anchor routes (dashboard, leads list, lead detail): about 30 shots.
  - Baselines generated on Linux in CI.
- **A11y:** axe (serious/critical blocking) on every route in light and dark, plus the ThemeCustomizer open.
- **Contrast:** gate over primary × mode × dark-palette (§5.1).
- **Performance:** DataTable trace (§5.6); dialog open under 100 ms from click to first paint.
- **New arch gates:**
  - `bits-ui` imported only under `lib/components/ui/`.
  - No `vaul-svelte`, `lucide-svelte` or `mode-watcher` imports.
  - No raw `<table>` / `<textarea>` / `<select>` in `features/**` or `routes/**`, and no raw `<input>` except `type="hidden"`.
  - No legacy token prefixes.
  - No client-side `$effect` + `goto` capability guards.

## 9. Branching and delivery

- Branches live in the main repo; no worktrees.
- `feat/kit3-hardening` (Phase 1) branches from `feat/bits-ui-refactor`.
- `feat/ui-foundation` (Phase 2) branches from Phase 1.
- Phase 3 uses one branch per page group.
- Each phase ships with all CI gates green.
- Commits are small and per concern.

## 10. Risks

| Risk                                                                      | Mitigation                                                                    |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `resolve()` semantics with group routes under Kit 3                       | `svelte-check` drives the fix; e2e covers navigation                          |
| `#` subpath imports in depcruise, knip, oxlint, vitest and the shadcn CLI | Keep custom `$` aliases during Phase 1; migrate them separately               |
| Storybook on Kit 3 is unconfirmed                                         | Smoke test; if broken, pin and file an issue. Not blocking.                   |
| bits-ui bus factor                                                        | Only `ui/` imports it (gate), so a swap means one folder                      |
| Customizer state explosion                                                | CSS-only axes; pairwise visual matrix; contrast gate over colour combinations |
| shadcn upstream drift                                                     | `CUSTOMIZATIONS.md` plus a quarterly overwrite diff                           |
| Big-bang component swap breaking e2e selectors                            | Migrate per primitive; e2e selectors use roles and labels, not classes        |
