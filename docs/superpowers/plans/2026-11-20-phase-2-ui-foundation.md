# Phase 2 — UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the web app one token layer, one CSS-driven preferences system (cookie + SSR, 8 Domiex customizer axes), a regenerated shadcn-svelte primitive layer, a Domiex-matched shell with five layout variants, the shared page patterns from the reuse catalogue, and a TanStack + virtua DataTable. Then migrate every stable page (auth, dashboard, settings, operator) onto it, so the leads / orders / inventory rebuilds that follow are built once, on this foundation.

**Architecture:** The cookie `lk_ui` is decoded in `hooks.server.ts` and written as eight `data-*` attributes on `<html>` through `transformPageChunk`. The inline theme script goes away. CSS alone (`light-dark()`, attribute selectors) turns those attributes into the shadcn-named semantic tokens and the shell geometry, so changing an axis never re-renders a component; the one exception is `layout=horizontal`, which swaps `Sidebar` for `HorizontalNav`. Components consume only semantic tokens. `lib/components/ui/` is shadcn-svelte CLI output plus a short, documented list of local edits. LeadKart composites live in `components/{data,feedback,form}` and `layouts/`.

**Tech Stack:** SvelteKit 3.3 (adapter-node BFF), Svelte 5 runes, TypeScript 6, Tailwind 4, bits-ui 2 + shadcn-svelte CLI 1.8, @tanstack/svelte-table 9 + virtua, @tanstack/svelte-query 6, svelte-i18n, Vitest 4 (Svelte `mount`), Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-18-platform-upgrade-ui-foundation-design.md` (§5, §6, §8, owner decisions D2–D8) and its appendix `docs/superpowers/specs/2026-11-18-reuse-catalogue.md`. Executors read both. Where this plan departs from the spec, the Decision Log (section 3) says so and why.

**Visual source of truth:** the Domiex theme, read-only. This plan writes `DOMIEX/` for `D:/Development/Domiex-svelte-ts-admin/Svelte/Admin/`. Domiex is Svelte 4 syntax with Tailwind JS plugins. Port the values (sizes, spacing, colours, structure), never its code style.

---

## 0. Global Constraints

These apply to every task, in addition to its own requirements.

- **Branch.** Work on `feat/ui-foundation`, created by the controller from `feat/go-contract` HEAD before Task 1. Use the main repo; never a worktree. Commits are small and per concern. Never push.
- **Runes only.** Shared reactive logic uses factory functions in `*.svelte.ts`. No classes; `Error` subclasses are exempt. No module-level `$state`. Singletons that hold per-request state are banned: on the server a module value is shared by every request. Per-request state goes through Svelte context or `page.data`.
- **Tokens.** Every colour is a semantic token (section 4). Never write hex, rgb or oklch literals outside `src/styles/theme/*.css` and `src/styles/tokens.css`. Spacing comes from the 4px token scale. Shell dimensions come from `src/styles/theme/layouts.css`. Component `<style>` blocks contain no one-off pixel values.
- **CSP stays strict.** `script-src 'self'` plus Kit nonces, `style-src-elem 'self'`, `style-src-attr 'unsafe-inline'` (`vite.config.ts`). Never inject a `<style>` or `<script>` element at runtime. Preferences work only through `<html data-*>` and static CSS. Inline `style=""` attributes are allowed but are never used for colours.
- **Dark mode and `color-scheme`.** Dark is selected by `<html data-mode>` (the `dark:` custom variant keys on it), never a `.dark` class. Never flip tokens with a nested `color-scheme`: production CSS compiles `light-dark()` to variables resolved on `:root` (Lightning CSS), so a nested `color-scheme` flips tokens in dev but not in the build. Override tokens on `:root[data-…]` or on a scoped selector that re-declares them. `color-scheme` is declared only in `src/styles/theme/semantic.css` (gate: `check-tokens`).
- **Opaque tokens in regenerated files (L37).** Anything that carries contrast uses an opaque semantic token: `hover:bg-primary-hover`, `ring-ring`, `text-sidebar-muted-foreground`, `bg-input-fill`. No `/<alpha>` modifier on a text, ring, `border-input` or solid-fill colour utility under `src/lib/components/ui/**`; only the pinned decorative scrim `bg-black/50` is allowed (gate: `check-tokens`).
- **RTL-safe.** Use logical utilities only: `ms-/me-/ps-/pe-/start-/end-/border-s/border-e/text-start/text-end`. `scripts/arch/check-rtl-safety.mjs` must stay green. Generated shadcn files are converted by the normaliser (Task 4).
- **A11y.** WCAG 2.2 AA; axe serious and critical findings block. Focus rings use `focus-visible:` only. Every page has exactly one `<h1>`, rendered by `PageHeader` (Task 14). Every route group keeps its `+error.svelte`.
- **i18n.** New user-facing strings in shell and shared components go to `src/lib/i18n/locales/{en,hi}.json` under the namespaces this plan names. `check-locale-parity` requires both files. Hindi copy must be real Hindi, not English copied across.
- **bits-ui is imported only under `src/lib/components/ui/**`.** This becomes a gate in Task 7. Icons come only from `#lib/icons/index.ts`; add the re-export there when an icon is missing.
- **Reuse first (D7).** A second similar occurrence means a shared piece. A task that adds a shared piece migrates every listed occurrence in the stable features in the same commit. The stable features are auth, dashboard, tenant, users, roles, permission-requests, operator, audit and search. Occurrences in `features/{leads,orders,inventory}` and `routes/(app)/{leads,orders,inventory}` are not redesigned in Phase 2. They get only mechanical changes (token renames, primitive API renames, the drawer shim) that keep them compiling and rendering, and they are listed in section 9 (the contract).
- **Packages.** Add only those approved in section 6.
- **Test cadence (owner rule).**
  - Per task, run only fast checks:
    - `npm run check`
    - `npx vitest run <the touched test files>`
    - `npm run arch:check`
    - `npx prettier --check <changed files> && npx eslint <changed files>`
    - the specific e2e specs the task names: `npm run build && CI=1 npx playwright test <specs> --project=chromium --retries=0`, run from the Bash tool
  - Full suites run only in the checkpoint tasks (8, 17, 29, 32).
- **Tests.** Unit and component tests use Svelte's `mount`/`unmount`/`flushSync`, plus `createRawSnippet` for snippets. They also use the existing helpers:
  - `tests/unit/helpers/reactive-props.svelte.ts`: `reactiveProps<T>(initial)`
  - `tests/unit/helpers/form-root.svelte.ts`: `formInRoot(schema, initial, opts?)`
  - `tests/unit/helpers/real-mutations.svelte.ts`: `withRealMutations(...)`
  - the hosts in `tests/unit/stubs/`

  Do not use `@testing-library/svelte` (not installed, not approved). Component tests live in `tests/unit/components/`, server tests in `tests/unit/server/` (node project), and pure-module tests in `tests/unit/<area>/`.

- **e2e selectors.** Use roles, labels and stable ids. When a markup change breaks a selector, update the spec to a role or label selector in the same commit; never add a class selector. Ids that specs rely on and that must survive: `#main-content`; the `form="<id>"` ids on submit buttons (`create-permission-request-form`, `register-tenant-form`, and the leads/orders/inventory ones); `button[aria-label="Search (Cmd+K)"]`; `html[data-hydrated="true"]`; `[data-scope-context]`; `[data-roving-root]` (inventory, untouched).
- **Commit messages** follow the repo style, `type(scope): sentence`, e.g. `feat(prefs): …`, `refactor(ui): …`, `test(visual): …`. End each with the session's attribution trailer.

---

## 1. Review Focus

Five inputs that the spec implies but no happy-path test exercises, most likely first. Each has a pinned test in the task named.

1. **A hostile or broken `lk_ui` cookie.** The cookie might not be base64, might be over 300 bytes, might carry unknown values, might be JSON of the wrong shape, or might contain `"><script>`. The page must render with defaults for the bad fields only. The `<html>` attributes come only from the enum, never from raw cookie text. The value is never used for anything except presentation. Owner: Task 1 (`decodePreferences` tests plus a `transformPageChunk` SSR test).
2. **Leaving a form surface while its save is in flight, then reopening it.** Escape, outside click, Close, the back button and a route change are all ways out. Reopening must not show the previous open's errors or values. This must survive the move from vaul/bits to regenerated shadcn primitives. Owners: Task 4 (busy veto on the regenerated `Dialog`/`Sheet`/drawer shim) and Task 18 (`FormSheet`/`FormDialog` reset on open, `useLeaveGuard`).
3. **Selection and focus in a virtualised table.** A table with 1,000+ rows, where rows were selected, then scrolled out of view or sorted. The selection persists by row id; "select all" means all loaded rows and says so; keyboard focus does not jump when virtua recycles rows. Owner: Task 24.
4. **An operator in tenant context on every shell variant.** The variants are horizontal layout, small sidebar, mobile sheet, pattern nav type and boxed. The banner naming the tenant and the Exit control are always visible and keyboard-reachable, and exit from any page lands on `/operator/tenants`. Owners: Task 12 (unit and e2e) and Task 30 (visual shots).
5. **Hindi and English SSR requests interleaved.** Each response renders its own locale, with no cross-request leakage through svelte-i18n's global `locale` store, and `<html lang>` matches. Owner: Task 3 (concurrent-request e2e).

---

## 2. Current state (what the code says, 2026-11-20)

The plan is built on this inventory. Tasks refer to it.

**Phase 1 preference plumbing was never shipped.**

- `src/app.html` still runs an inline nonce'd script that reads `localStorage['leadkart-primary' | 'leadkart-content-width' | 'leadkart-sidebar-collapsed']` and forces `data-layout="semibox"`.
- `src/hooks.server.ts` has no `transformPageChunk`. `handle = sequence(securityHeadersHandle, sessionRefresh)`.
- `src/lib/hooks/use-theme.svelte.ts` (`theme` singleton) is used by `routes/+layout.svelte`, `layouts/{AppShell,SettingsModal}.svelte` and `routes/(dev)/styleguide/+page.svelte`.
- CSS for `data-primary`, `data-sidebar-collapsed`, `data-content-width` and `data-layout='semibox'` lives in `src/styles/base.css` lines 59–358.

**Tokens.**

- `src/styles/tokens.css` has the legacy Domiex-style `@theme` names `--color-bg*`, `--color-fg*`, `--color-brand-*`, `--color-primary*`, `--color-border(-strong)`, `--color-focus-ring`, the status ramps, `gray`, `logo-*` and `glass-*`.
- It also has a shadcn `:root` block plus `@theme inline` that redefine `--color-primary`, `--color-secondary`, `--color-border` and `--radius-*`. Both systems collide.
- The legacy family accounts for about 1,600 occurrences in 211 files. The heaviest are `text-fg-muted` (307), `text-fg` (227), `border-border` (163), `bg-bg-elevated` (113), `bg-bg-muted` (96), `text-fg-subtle` (84), `ring-focus-ring` (52), and 182 status-palette step utilities.
- The app is light-only. `app.css` has `@custom-variant dark (&:is(.dark *))`, and nothing sets it.

**`src/lib/components/ui/`.**

- About 30 dead folders.
- Dialog: shadcn plus a `busy` veto through `createBusyVeto` in `src/lib/hooks/use-busy-veto.svelte.ts`.
- Drawer: vaul-svelte, 14 importers.
- Sheet: no busy veto, no Header/Footer/Title/Close; 0 users.
- Alert-dialog: 0 users.
- Hand-rolled `data-table`, used by 7 lists.
- Button: cva, variants `primary|secondary|tonal|ghost|danger|glass|link`, a `loading` prop, no `href`.
- Badge: cva, `variant × appearance × size`.
- `Tooltip.Provider` is in `routes/+layout.svelte`. `Toaster` is only in `routes/(app)/+layout.svelte`.

**bits-ui outside `ui/`:** `components/form/{Combobox,DatePicker,DateRangePicker,RadioGroup,RadioItem,Switch}.svelte` and `features/search/components/CommandPalette.svelte`.

**Already built, reused as is:**

- `config/nav.ts` (`visibleNav`, `canSee`, `routeForPath`, `NAV_ROUTES`) and `nav-icons.ts`
- `features/auth/{permissions,capabilities}.ts` and the session store (`session.capabilities`, `session.can`, `session.inTenantContext`)
- `lib/server/guards.ts`
- `features/operator/scope/service.ts` (`enterTenantContext`, `exitTenantContext`) and `exitScopeMutation()`
- `utils/{format,status}.ts`
- `components/feedback/QueryState.svelte`
- `components/ui/DescriptionList.svelte`
- `components/data/InfiniteListFooter.svelte`
- `hooks/use-form.svelte.ts` (`useForm(schema, initial, { open })`, with generation semantics)
- `useResetOnChange`, `createBulkSelection`, `createKeyboardListNav`, `createInfiniteList`, `createListPagination`, `createUrlFilters` (`setMany`)
- `api/{errors,request-schema,mutations,code-copy}.ts` (`describeError` is the one describer; `createResourceMutation` exists)
- `server/form-action.ts` (`failForm`, the one failure shape for server actions)
- `TenantSaveFooter`, `ScopeContextField`

**Shell.**

- `layouts/{AppShell,Sidebar,Topbar,Footer,UserMenu,AuthShell (782 LOC),SettingsModal,NavProgressBar,PwaStatusBar}.svelte`.
- The Topbar renders an `<h1>` while pages render their own, so there are two `<h1>` per page.
- AuthShell's `<main>` has no `id="main-content"`.
- The impersonation banner is `features/operator/impersonation/components/ImpersonationBanner.svelte`.
- Tenant context is only shown inside `/operator/scope/*`, in the scope layout header.
- The scope cookie already carries `display_name` (`lib/server/scope.ts`).

**Tests.**

- The a11y project (`tests/a11y/routes.spec.ts`) is 8 pass / 15 fail: headings, landmarks, skip link.
- The visual project (`tests/visual/**`) is 72/72 fail. `tests/visual/fixtures/stability.ts` `freezeAnimations` calls `page.addStyleTag`, which CSP blocks. There is no `snapshotPathTemplate` and no baselines are committed.
- `tests/unit/config/app-html.test.ts` pins `data-sveltekit-preload-data="tap"`.
- Stale "hover" comments remain in `tests/e2e/helpers/test.ts:45-53` and `tests/e2e/hover-preload.spec.ts:6`.

**Queries created inside `$derived`** (they re-create on every input change) in the stable scope:

- `operator/people/components/PersonDetail.svelte:38,39,58`
- `users/components/UserDetailTabs.svelte:51`
- `operator/people/components/PeopleList.svelte:38`
- `routes/(app)/operator/scope/activity/+page.svelte:9`
- `routes/(app)/operator/persons/[id]/+page.svelte:8`

**i18n.** `initI18n()` picks `en` on the server and `getLocaleFromNavigator()` on the client. `<html lang="en">` is hard-coded. Hindi browsers get English SSR, then Hindi.

**Task 15 of 1c (form dialogs) is absorbed here** as Tasks 6, 18 and 20. Its brief is `.superpowers/sdd/1c-task-15-brief.md`, and its props API is kept.

---

## 3. Decision log

"Spec" means the decision is taken from the spec. "Plan decision" means the spec left room, or it disagreed with the code; the owner may reverse it. Each entry is one line of decision plus a reason.

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Source                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| L1  | Task 1 builds all of the preferences plumbing the spec assigned to Phase 1 (cookie, `PreferencesStorage`, `%lk.html.attrs%`, deleting the inline script), with the full 8-axis schema at once. Shipping it with 3 axes first would mean migrating the schema twice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Plan decision                                                                                                                                      |
| L2  | Axes, attribute names, value sets and defaults are exactly as in spec §5.2. Defaults: `layout=vertical`, `navType=default`, `contentWidth=default`, `sidebar=large`, `mode=light`, `colors=leadkart`, `sidebarColors=light`, `darkPalette=default`. This is a visible change from today's forced semibox.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Spec                                                                                                                                               |
| L3  | Cookie `lk_ui`: base64url of the JSON `{"v":1, <8 keys>}`. Not httpOnly, `SameSite=Lax`, `Path=/`, `Max-Age=31536000`, plus `Secure` when the page is https; the client sets it via `document.cookie`. ≤300 bytes (the full object is about 230). Unknown or invalid fields fall back per field. A raw value over 400 characters or undecodable falls back to all defaults. Not cleared at sign-out: it is device presentation, not user data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Spec + plan details                                                                                                                                |
| L4  | The store is `createPreferences(initial, storage)` put in Svelte context from `routes/+layout.svelte` and read with `getPreferences()`. It is not a module singleton, because the server renders many requests in one process.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Plan decision                                                                                                                                      |
| L5  | All 8 attributes are always written on `<html>`, defaults included, so CSS can match on `:root[data-x='default-value']`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Plan decision                                                                                                                                      |
| L6  | `black-white` puts `filter: grayscale(1)` on `:root` itself. Per Filter Effects §5, the root element is the one element whose filter does **not** create a containing block for fixed descendants. A filter on an app wrapper would break the fixed sidebar and topbar, and would miss portalled dialogs. This contradicts the reasoning in spec §5.2 but achieves its goal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Plan decision                                                                                                                                      |
| L7  | Legacy → semantic utility mapping, executed by the codemod in Task 9:<br>• `bg-bg` → `bg-background`<br>• `bg-bg-elevated` → `bg-card`<br>• `bg-bg-subtle` and `bg-bg-muted` → `bg-muted` (`--accent` equals `--muted`, as in shadcn neutral themes)<br>• `text-fg` → `text-foreground`<br>• `text-fg-muted` and `text-fg-subtle` → `text-muted-foreground` (two text levels, shadcn canon; the old fg-subtle level is dropped)<br>• `text-fg-on-brand` and `text-primary-fg` → `text-primary-foreground`<br>• `border-border` unchanged<br>• `border-border-strong` → `border-input`<br>• `ring-focus-ring` → `ring-ring`<br>• `*-primary-hover` → `bg-primary-hover` / `text-primary-hover` (opaque token; never `/90`, see L37)<br>• `*-primary-active` → `*-primary-hover` (no alpha steps, see L37)<br>• `*-brand-50` and `*-primary-soft` → `*-primary-soft`<br>• other `*-brand*` → `*-primary`<br>Status ramps:<br>• `bg-{s}-50                                                                                                                                                                                                                                                  | 100`→`bg-{s}-soft`<br>• `bg-{s}-400..700`→`bg-{s}`<br>• `text-{s}-500..950`→`text-{s}`<br>• `border-{s}-\*`→`border-{s}/40`<br>• here `s ∈ success | warning | info`, and `danger`maps to`destructive`<br>• `secondary-N`(logo neon green) → the success equivalents<br>•`gray-N`: `text-_`→`text-muted-foreground`, `bg-50..200`→`bg-muted`, `border-_`→`border-border` | Plan decision |
| L8  | `--input` takes today's `--color-border-strong` value (≥3:1 against the card). Form-control boundaries need WCAG 1.4.11 non-text contrast. Domiex's `gray-200` input border fails it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Plan decision                                                                                                                                      |
| L9  | Light-mode values keep today's rendered values. For example `--background` = today's `--color-bg` and `--card` = `--color-bg-elevated`. Spec §5.1: "the look stays, only the names standardise".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Spec                                                                                                                                               |
| L10 | Primary: each palette sets `--primary-solid` to the lightest step ≥600 whose white-foreground contrast is ≥4.5. Start at 600 for leadkart, violet, fuchsia and orange, and at 700 for green, teal, lime and amber; the contrast gate is the judge. Dark mode: `--primary` = step 400 with foreground step 950 (or step 300 if the gate says so). Domiex uses step 500, which fails AA on white for 5 of the 8 colours.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Plan decision                                                                                                                                      |
| L11 | Dark surfaces are selected by `data-dark-palette`. The ramp is copied from Domiex `dark-color.css`; `default` is Tailwind v4 slate plus Domiex's `dark-850`. Mapping (Domiex usage):<br>• `background` = 950<br>• `card` / `popover` / `sidebar` = 900<br>• `muted` = 850<br>• `border` = 800<br>• `input` = 600<br>• `foreground` = 100<br>• `muted-foreground` = 400 (Domiex uses 500, which fails 4.5:1 on 950)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Plan decision                                                                                                                                      |
| L12 | Sidebar colours are copied from Domiex `sidebar-color.css`, with Tailwind palette references replaced by their Tailwind v4 oklch literals. `brand` = `--primary-900` background with `--primary-100` text, following the chosen primary (Domiex's brand is its own blue). A `light` sidebar in dark mode uses `--dark-900`, as in Domiex.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Plan decision                                                                                                                                      |
| L13 | Non-colour tokens are unchanged: type scale, spacing, radius, shadow, z-index, motion, font stack (spec §5.1). The two radius definitions collapse to the value that renders today, `--radius: 0.75rem` (the unlayered `:root` block wins over `@theme`), with shadcn's derived `sm/md/lg/xl`. The system font stack stays, which conflicts with CLAUDE.md's "Inter Variable"; see section 6 for the optional font package.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Spec + plan details                                                                                                                                |
| L14 | **Forms.** Keep `useForm` for client (TanStack-mutation) forms and Kit `use:enhance` plus `failForm` for server-action forms. Use one field anatomy, shadcn-svelte `field` (`Field.Field`, `Field.Label`, `Field.Description`, `Field.Error`), which is library-agnostic, as the one label/hint/error wrapper. Superforms and formsnap are **not** adopted in Phase 2. Spec §5.5 says "every form uses superforms". The hardening work, though, put security-relevant generation and busy semantics in `useForm` and the one i18n failure shape in `failForm` (12 actions). Re-implementing both on superforms is a rewrite with no user-visible gain (D7) and a security-review surface. The `FormSheet`/`FormDialog`/`ActionForm` props are library-agnostic, so a later swap stays local.                                                                                                                                                                                                                                                                                                                                                                                             | Plan decision                                                                                                                                      |
| L15 | Generated set: spec §5.5 minus `form` (see L14) and minus `chart`, plus `field`. `chart` and `layerchart` arrive with the first chart, in Phase 3 dashboards; Phase 2 has no chart and D7 forbids zero-user pieces.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Plan decision                                                                                                                                      |
| L16 | LeadKart composites in `ui/` stay where they are and are never targeted by the CLI: `AuthCard`, `ConfirmDialog`, `CopyButton`, `DescriptionList`, `EmptyState`, `Logo`, `StatCard`, `StatusPill`, `kanban/`, `stepper/`, `timeline/`, `spinner/`, and the legacy `data-table/`. They are listed in `ui/CUSTOMIZATIONS.md`. Moving them would churn about 100 imports for no behaviour. Dead ones are deleted: `InlineEdit`, `tree/`, `date-picker/`, `kbd/`, `aspect-ratio/`, `button-group/`, `combobox/`, `context-menu/`, `hover-card/`, `menubar/`, `navigation-menu/`, `form/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Plan decision                                                                                                                                      |
| L17 | `ui/drawer` becomes a shim that re-exports the regenerated `Sheet` parts with the old names. vaul-svelte is removed. The shim is deleted when its last leads/orders/inventory user is rebuilt. New imports of `ui/drawer` are blocked by a gate allowlist (Task 16).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Plan decision                                                                                                                                      |
| L18 | The legacy `ui/data-table` stays only for `inventory/ProductsList` and `orders/OrdersList` (allowlisted). `leads/LeadsTable` stays. Both go when their rebuild tasks land.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Plan decision                                                                                                                                      |
| L19 | Button uses shadcn variant names (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) plus the LeadKart `tonal` variant and a `loading` prop, added by cva in the same file. Call sites are codemodded:<br>• `primary` → `default`<br>• `danger` → `destructive`<br>• `glass` → `outline`<br>• `size="md"` → `default`<br>• `fullWidth` → `class="w-full"`<br>Badge uses shadcn's 4 variants plus the soft status variants `neutral`, `info`, `success`, `warning`, `danger`, `brand` (= `StatusVariant` in `utils/status.ts`). `appearance` and `size` are removed by codemod; the one `appearance="outline"` becomes `variant="outline"`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Plan decision                                                                                                                                      |
| L20 | Sidebar uses the shadcn-svelte `sidebar` block (spec). The sizes are `data-sidebar` on `:root`: `large` 15rem, `medium` 10rem with icon above a centred label, and `small` 4.6875rem, icon-only with tooltip (Domiex values). `Sidebar.Provider` `open` is `prefs.sidebar !== 'small'`. Its own `sidebar_state` cookie write is deleted (local edit). The toggle (button, Ctrl/Cmd+B) switches `small ↔ large`. Selectors on the html attribute are always written `:root[data-sidebar=…]`, because shadcn elements carry their own `data-sidebar` attributes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Spec + plan details                                                                                                                                |
| L21 | Shell geometry uses Domiex values:<br>• topbar 4.6875rem<br>• footer 3.5rem<br>• page padding `1.25rem`, widening to `7rem` at xl unless fluid<br>• semibox gap 0.75rem with bordered rounded panes<br>• boxed outer margin 2rem on a `--primary-500` canvas (Domiex `sky-500` analogue that follows the primary)<br>All are vars in `styles/theme/layouts.css`, switched by `:root[data-layout=…]`. One `AppShell`; `horizontal` is the only structural branch (spec).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Plan decision (values from Domiex)                                                                                                                 |
| L22 | Nav types apply in every layout except `horizontal` (Domiex shows them for `modern` only; nothing breaks elsewhere). `pattern` is CSS-only: a `--primary` band with a `radial-gradient` dot overlay, no image.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Plan decision                                                                                                                                      |
| L23 | The breadcrumb lives only in `PageHeader`, as in Domiex `PageHeading`. The Topbar has no breadcrumb and no heading. Spec §5.4 wanted a `<span>` crumb in the topbar so the page owns the `<h1>`; that goal is met without a second crumb trail (D7).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Plan decision                                                                                                                                      |
| L24 | One `ContextBanner` (layouts) renders both "acting in tenant X" and "impersonating". This is D7's second occurrence. The scope layout's Exit button moves into the banner, so there is one Exit control. `(app)/+layout.server.ts` adds `tenantContext: { displayName, isPlatform } \| null`, derived from the signed scope cookie. The slug and id never reach the client.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Plan decision                                                                                                                                      |
| L25 | Customizer:<br>• Groups render from one config array derived from the schema (spec).<br>• Nav type is hidden when `layout=horizontal`.<br>• Sidebar size and sidebar colour are hidden when `layout=horizontal`.<br>• Dark palette is shown only when `mode ∈ {dark, auto}`.<br>• Layout tiles `modern` and `semibox` are hidden below `lg`, as in Domiex.<br>• The Topbar also has a mode button that toggles light ↔ dark; from `auto` it goes to the opposite of the OS scheme.<br>• No RTL group (D5: LTR only).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Plan decision                                                                                                                                      |
| L26 | DataTable:<br>• Pages pass a LeadKart column type (`DataTableColumn<T>`), never TanStack `ColumnDef`. TanStack v9 stays an implementation detail, so a v9 API change touches one folder.<br>• Location: `components/data/data-table/`.<br>• Loading, error and empty states reuse `QueryState`.<br>• Selection reuses `BulkSelection<T>`; "select all" means all loaded rows.<br>• Rows virtualise above 100 (spec).<br>• Cursor pagination reuses `InfiniteList<T>` and `InfiniteListFooter`.<br>• Offset pagination reuses the `Pagination` composite.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Spec + plan details                                                                                                                                |
| L27 | New gates (Task 7, Task 16), each with an explicit allowlist that names the leads/orders/inventory files waiting for their rebuild:<br>• bits-ui only under `ui/`<br>• no vaul/lucide-svelte/mode-watcher<br>• no raw `<table>`/`<textarea>`/`<select>`/non-hidden `<input>` in `features/**` and `routes/**`<br>• no legacy token prefixes and no palette-step colour utilities<br>• no `ui/drawer` or legacy `ui/data-table` import outside the allowlist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Spec + plan details                                                                                                                                |
| L28 | Locale: negotiated per request from `Accept-Language` (`en` or `hi`). No cookie and no switcher, which matches today's navigator-based behaviour. The server preloads both dictionaries with `addMessages` and sets svelte-i18n's locale synchronously at the top of `routes/+layout.svelte` during SSR; Svelte 5 SSR renders in one synchronous pass, so no other request can interleave. `<html lang>` comes from `%lk.html.lang%`, and the client starts from `document.documentElement.lang`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Plan decision                                                                                                                                      |
| L29 | Visual baselines:<br>• `snapshotPathTemplate` keyed by `{platform}`.<br>• Task 30 commits `win32` baselines for local regression.<br>• Linux baselines come from the existing `visual-refresh.yml` workflow when the owner pushes (spec §8: "baselines on Linux in CI").<br>• The per-axis anchor routes are `/dashboard`, `/settings/users` and `/settings/users/[id]` until the leads rebuild moves them to the spec's leads list and lead detail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Plan decision                                                                                                                                      |
| L30 | The visual stabiliser freezes motion through `document.adoptedStyleSheets` with a constructed `CSSStyleSheet`. That is not a `<style>` element, so `style-src-elem` does not apply. It also uses Playwright's `animations: 'disabled'` and `caret: 'hide'`. If Task 30's probe shows Chromium blocks it, the visual project alone sets `bypassCSP: true` (e2e and a11y keep the real CSP).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Plan decision                                                                                                                                      |
| L31 | Catalogue items not closed in Phase 2 (carried in section 9):<br>• #13 (`api.postForm`/`getBlob`, bulk schemas)<br>• #23 `MembershipPicker`<br>• `optionsFromLabels`<br>• the leads/orders/inventory occurrences of #1, #2, #3, #6, #7, #11, #12 and #21<br>• #9 rollout (`createResourceMutation` exists)<br>• #10 is closed (dashboards); #22 is closed for tenant forms and every FormSheet, the role editor is Phase 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Plan decision                                                                                                                                      |
| L32 | `PermissionTree` drops `role="tree"` (it has no treeitems, an a11y failure) and renders one `<fieldset>` per group with regenerated `Checkbox` items.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Plan decision                                                                                                                                      |
| L33 | Error pages: one `RouteError` (Card + Alert + Button `href`) renders inside the group's shell. The root `+error.svelte` keeps its no-JS sign-out form.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Spec (#15) + plan details                                                                                                                          |
| L34 | Status tokens in dark mode: `--{s}` = palette step 400, `--{s}-foreground` = step 950, `--{s}-soft` = `color-mix(in oklch, var(--palette-{s}-400) 15%, var(--card))`. Light: `--{s}` = step 600, foreground white, soft = step 50. All are subject to the contrast gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Plan decision                                                                                                                                      |
| L36 | The form `Select` stays a native `<select>` with shadcn/Domiex styling. It is the best keyboard and screen-reader behaviour, needs no JS for server-action forms, and e2e `selectOption` keeps working. The multi-select in FilterBar becomes `Popover` + `Command` with checkbox items (Task 26), and its leads e2e interaction moves to role selectors in that task.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Plan decision                                                                                                                                      |
| L35 | A Domiex auth page is the "basic" sign-in card (`DOMIEX/src/routes/auth-signin-basic/BasicSignIn.svelte`) placed in the existing AuthShell frame, whose brand panel and particle field stay (spec §5.4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Plan decision                                                                                                                                      |
| L37 | **Controller defaults, pending owner confirmation.** (1) A primary that fails AA on the surfaces it is used on as TEXT (page background, muted, `primary-soft`, the sidebar active tint) is stepped darker: one `--primary` token, no separate text token. Final `--primary-solid` steps: leadkart logo purple; violet 700; fuchsia 700; orange 700; green, lime, amber, teal 800. (2) **Revises L7:** hover is an opaque semantic token, not an alpha modifier: `*-primary-hover → bg-primary-hover`, never `/90`; `--destructive-hover` likewise. The same rule gives `ring-ring` at full strength (3:1 on background, card, muted, popover), `--sidebar-ring` and `--sidebar-muted-foreground` per sidebar colour, `--input-fill` (opaque dark fill replacing `dark:bg-input/30`), and a dark `--input` of step 400 (3:1 on card and muted). (3) The contrast gate composites alpha and `transparent` in sRGB over the pair's real backdrop (`over`), and a pair that resolves to a missing variable fails. Why: an independent review recomputed the committed palette; four of eight primaries failed AA as text, and the shadcn output (`/90`, `/50`, `/70`, `/30`) was unchecked. | Plan decision (owner to confirm)                                                                                                                   |
| L38 | **Controller default, pending owner confirmation.** Light `--destructive` is palette step 700 (was 600). Error text in a muted section reached only 3.84:1 on `--muted` at 600; 700 passes on background, card, popover and muted, like the other status colours. Visible change: every destructive button, destructive link and field error is one step darker in light mode (`--destructive-hover` and `--chart-5` follow). Dark mode is unchanged. The pair `destructive on muted` is now in `scripts/arch/check-token-contrast.mjs`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

---

## 4. Token architecture (normative for Tasks 2, 9, 16)

### 4.1 Files

| File                            | Holds                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/theme/palettes.css` | Primitive ramps only, on `:root`. `--palette-{leadkart,green,violet,orange,teal,fuchsia,lime,amber}-{50,100,…,950}`; `--palette-{success,warning,danger,info}-{50..950}` (today's values from `tokens.css`); `--palette-gray-{50..950}` (today's `--color-gray-*`); `--neutral-{default,zinc,stone,neutral,gray}-{50..950}` plus `-850`.                                                     |
| `src/styles/theme/semantic.css` | Mode → `color-scheme`; the selected ramps (`--primary-50..950`, `--primary-solid`, `--dark-50..950/850`); every semantic token via `light-dark()`; the overrides for `data-colors`, `data-dark-palette`, `data-sidebar-colors` and `data-mode='black-white'`. Flat rules only, with selectors `:root` or `:root[data-…='…']`. No nesting and no `@media`, so the contrast gate can parse it. |
| `src/styles/theme/layouts.css`  | Shell geometry vars and their overrides per `data-layout`, `data-sidebar`, `data-content-width`, `data-nav-type` (Task 11).                                                                                                                                                                                                                                                                  |
| `src/styles/tokens.css`         | Non-colour tokens, unchanged, plus the `@theme inline` colour bridge (4.3). The legacy colour names stay as aliases until Task 16 deletes them.                                                                                                                                                                                                                                              |
| `src/app.css`                   | `@import 'tailwindcss'`, `tw-animate-css`, the `dark` custom variant (4.4), and the styles barrel.                                                                                                                                                                                                                                                                                           |

**Browser floor** is Tailwind 4's (Safari 16.4+, Chrome 111+, Firefox 128+). `light-dark()` is lowered by Lightning CSS in the production build, which is why `color-scheme` must not be nested (section 0).

Sources for the ramps:

- leadkart: today's `--color-brand-50..950`, keeping the literal `#953fc9` (500), `#502d81` (600) and `#1e1043` (900).
- green, orange, teal, violet, fuchsia, lime, amber: copied verbatim from `DOMIEX/src/lib/css/themes-color/primary-color.css`.
- neutrals: copied from `DOMIEX/src/lib/css/themes-color/dark-color.css`. `default` is Tailwind v4 slate (`node_modules/tailwindcss/theme.css`) plus `--neutral-default-850: oklch(23.13% 0.0399 270.37)` from `DOMIEX/src/lib/css/components/theme.css`.

### 4.2 Semantic tokens (names are the contract)

shadcn names:

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`
- `--chart-1..5`
- `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`

LeadKart extensions:

- `--primary-soft`
- `--primary-hover`, `--destructive-hover`: opaque hover fills (light mixes 15% black, dark 15% white; bridged as `bg-primary-hover`, `bg-destructive-hover`)
- `--input-fill`: field fill; transparent in light, opaque dark step 800 (bridged as `bg-input-fill`)
- `--sidebar-ring`, `--sidebar-muted-foreground`: follow the sidebar colour (4.5:1 text, 3:1 ring on each of the five sidebars)
- `--destructive-soft`
- `--success`, `--success-foreground`, `--success-soft`
- `--warning`, `--warning-foreground`, `--warning-soft`
- `--info`, `--info-foreground`, `--info-soft`

Skeleton of `semantic.css`. The executor fills each ramp the same way: 11 steps plus 850 where noted.

```css
:root {
	color-scheme: light;
	/* selected ramps */
	--primary-50: var(--palette-leadkart-50); /* …through 950 */
	--primary-solid: var(--palette-leadkart-600);
	--dark-50: var(--neutral-default-50); /* …through 950, plus --dark-850 */

	--background: light-dark(oklch(0.96 0.008 268), var(--dark-950));
	--foreground: light-dark(oklch(0.18 0.02 250), var(--dark-100));
	--card: light-dark(oklch(1 0 0), var(--dark-900));
	--card-foreground: var(--foreground);
	--popover: var(--card);
	--popover-foreground: var(--foreground);
	--muted: light-dark(oklch(0.9 0.008 268), var(--dark-850));
	--muted-foreground: light-dark(oklch(0.42 0.02 250), var(--dark-400));
	--accent: var(--muted);
	--accent-foreground: var(--foreground);
	--secondary: light-dark(var(--primary-50), var(--dark-800));
	--secondary-foreground: light-dark(var(--primary-800), var(--dark-100));
	--border: light-dark(oklch(0.9 0.01 245), var(--dark-800));
	--input: light-dark(oklch(0.55 0.015 245), var(--dark-600));
	--ring: light-dark(var(--primary-500), var(--primary-400));
	--primary: light-dark(var(--primary-solid), var(--primary-400));
	--primary-foreground: light-dark(oklch(1 0 0), var(--primary-950));
	--primary-soft: light-dark(
		var(--primary-50),
		color-mix(in oklch, var(--primary-400) 15%, var(--dark-900))
	);
	--destructive: light-dark(var(--palette-danger-600), var(--palette-danger-400));
	--destructive-foreground: light-dark(oklch(1 0 0), var(--palette-danger-950));
	--destructive-soft: light-dark(
		var(--palette-danger-50),
		color-mix(in oklch, var(--palette-danger-400) 15%, var(--dark-900))
	);
	/* --success / --warning / --info: same three-line pattern as destructive (L34) */
	--chart-1: var(--primary);
	--chart-2: var(--success);
	--chart-3: var(--warning);
	--chart-4: var(--info);
	--chart-5: var(--destructive);
	/* sidebar (light sidebar colours; Domiex theme.css defaults) */
	--sidebar: light-dark(oklch(1 0 0), var(--dark-900));
	--sidebar-foreground: light-dark(oklch(0.551 0.027 264.364), var(--dark-400));
	--sidebar-primary: var(--primary);
	--sidebar-primary-foreground: var(--primary-foreground);
	--sidebar-accent-foreground: light-dark(var(--primary-solid), var(--primary-400));
	--sidebar-accent: color-mix(in oklch, var(--sidebar-accent-foreground) 10%, transparent);
	--sidebar-border: light-dark(oklch(0.928 0.006 264.531), var(--dark-800));
	--sidebar-ring: var(--ring);
}
:root[data-mode='dark'] {
	color-scheme: dark;
}
:root[data-mode='auto'] {
	color-scheme: light dark;
}
:root[data-mode='black-white'] {
	color-scheme: light;
	filter: grayscale(1);
}
:root[data-colors='green'] {
	--primary-50: var(--palette-green-50); /* … */
	--primary-solid: var(--palette-green-700);
}
/* one block per non-default colour, per dark palette (data-dark-palette remaps --dark-*), and per sidebar colour */
:root[data-sidebar-colors='dark'] {
	--sidebar: oklch(0.278 0.033 256.848);
	--sidebar-foreground: oklch(0.707 0.022 261.325);
	--sidebar-accent-foreground: oklch(0.985 0.002 247.839);
	--sidebar-border: oklch(0.278 0.033 256.848);
}
:root[data-sidebar-colors='brand'] {
	--sidebar: var(--primary-900);
	--sidebar-foreground: var(--primary-100);
	--sidebar-accent-foreground: oklch(1 0 0);
	--sidebar-border: var(--primary-900);
}
/* purple: Tailwind purple-950 bg, #b98fd7 text, #dfd3eb active; sky: sky-900 bg, #8ea2b5 text, sky-50 active (DOMIEX sidebar-color.css) */
```

### 4.3 Tailwind bridge (in `tokens.css`)

`@theme inline { --color-<name>: var(--<name>); … }` covers every semantic token in 4.2. `--radius-sm/md/lg/xl` are derived from `--radius: 0.75rem`. The legacy `@theme` colour block becomes aliases in Task 2 (`--color-bg: var(--background)`, `--color-bg-elevated: var(--card)`, …, `--color-brand-N: var(--primary-N)`, `--color-primary-fg: var(--primary-foreground)`, `--color-focus-ring: var(--ring)`, status ramps → `var(--palette-*)`), so unswept call sites keep rendering and follow dark mode. Task 16 deletes the aliases, the glass tokens and the old shadcn `:root` block.

### 4.4 `dark:` variant (spec, verbatim, in `app.css`)

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

### 4.5 Contrast gate contract (`scripts/arch/check-token-contrast.mjs`, rewritten in Task 2)

The gate evaluates every combination of `colors (8) × mode (light, dark) × darkPalette (5) × sidebarColors (5)`.

**Resolver.**

- Read `src/styles/theme/{palettes,semantic}.css`.
- Parse flat rules with the regex `/([^{}]+)\{([^{}]*)\}/g`. Fail on any rule whose selector is not `:root` or `:root` followed by `[data-x='y']` groups.
- For a combination, apply every rule whose attribute conditions all hold, in source order.
- Resolve `var()` recursively.
- Resolve `light-dark(a, b)` by mode (`light` takes `a`, `dark` takes `b`).
- Resolve `color-mix(in oklch|srgb, X p%, Y)` with culori `interpolate([Y, X], 'oklch'|'rgb')(p/100)`. `transparent`, and a mix toward it, is alpha-composited in sRGB over the pair's `over` backdrop. A pair that resolves to a missing variable is a failure, and an empty pair list fails.

**Pairs.** Text pairs need ≥4.5; the UI pairs marked (3) need ≥3. A pair may carry `alpha`, `alphaOn` and `over` (the backdrop that `transparent` and alpha composite onto, default `card`). Backdrops: `background`, `card`, `muted` (and `popover` for rings).

- foreground, muted-foreground / each backdrop
- primary-foreground / primary and / primary-hover
- primary / each backdrop and / primary-soft (the solid is also text)
- legacy `brand-600` / `primary-50` (until the Combobox, DatePicker and DateRangePicker rebuild in Task 7)
- secondary-foreground / secondary
- destructive-foreground / destructive and / destructive-hover
- {success, warning, info}-foreground / {success, warning, info}
- {destructive, success, warning, info} / their `-soft`
- foreground and muted-foreground / input-fill, over card and over muted
- ring / each backdrop and popover (3)
- input / each backdrop (3)
- sidebar-foreground, sidebar-muted-foreground, sidebar-accent-foreground / sidebar
- sidebar-accent-foreground / sidebar-accent, over sidebar (the active tint is `color-mix(accent-fg 10%, transparent)`)
- sidebar-primary-foreground / sidebar-primary
- sidebar-ring / sidebar (3)

**Output.** On failure, print `combination · pair · ratio`. Exit 1.

---

## 5. File-structure map

### Created

| Path                                                                                                                                                                                                                                               | Responsibility                                                                                                                                                                                                                | Task                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `src/lib/features/preferences/{schema.ts,codec.ts,storage.ts,store.svelte.ts,context.ts,legacy.ts,index.ts,api.ts}`                                                                                                                                | Preferences: one schema; cookie codec; `PreferencesStorage` + `cookieStorage`; factory store; context accessors; one-time localStorage cleanup; barrel. `api.ts` is a stub (see Task 1) to satisfy `check-feature-structure`. | 1                    |
| `src/lib/server/html-shell.ts`                                                                                                                                                                                                                     | `htmlShellHandle`: decodes `lk_ui`, negotiates the locale (Task 3), fills `%lk.html.attrs%` and `%lk.html.lang%`.                                                                                                             | 1, 3                 |
| `src/styles/theme/{palettes,semantic,layouts}.css`                                                                                                                                                                                                 | Token layers (section 4).                                                                                                                                                                                                     | 2, 11                |
| `scripts/shadcn/normalize.mjs`                                                                                                                                                                                                                     | Post-CLI normaliser for imports, logical properties and icons.                                                                                                                                                                | 4                    |
| `src/lib/components/ui/CUSTOMIZATIONS.md`                                                                                                                                                                                                          | Every local edit to generated files, plus the non-CLI composite list.                                                                                                                                                         | 4                    |
| `src/lib/components/ui/{sheet,alert-dialog,command,popover,scroll-area,separator,table,field,input,textarea,label,checkbox,radio-group,switch,select,toggle,toggle-group,slider,progress,calendar,range-calendar,accordion,collapsible,sidebar,…}` | Regenerated shadcn primitives.                                                                                                                                                                                                | 4–7, 10              |
| `src/lib/components/form/TextareaField.svelte`                                                                                                                                                                                                     | Catalogue #11.                                                                                                                                                                                                                | 6                    |
| `src/lib/components/data/Pagination.svelte`                                                                                                                                                                                                        | Offset pager composite on `ui/pagination` (keeps today's `page/pageCount/onChange` API).                                                                                                                                      | 5                    |
| `src/lib/layouts/{NavItem,HorizontalNav,PageContainer,ContextBanner,TenantContextBanner,AuthBrandPanel,AuthBackdrop,PageHeader,SectionNav,ThemeCustomizer,CustomizerTile}.svelte`, `src/lib/layouts/customizer-config.ts`                          | Shell.                                                                                                                                                                                                                        | 10–15                |
| `src/lib/components/feedback/{RouteError,ReasonConfirmDialog}.svelte`                                                                                                                                                                              | #15, #2.                                                                                                                                                                                                                      | 14, 20               |
| `src/lib/components/form/{FormDialog,FormSheet,ActionForm}.svelte`                                                                                                                                                                                 | #1, #14.                                                                                                                                                                                                                      | 18, 21               |
| `src/lib/hooks/{use-leave-guard.svelte.ts,use-dialog-state.svelte.ts}`                                                                                                                                                                             | #22, #21 `createDialogState`.                                                                                                                                                                                                 | 18                   |
| `src/lib/components/data/data-table/{DataTable.svelte,DataTableHeader.svelte,DataTableBody.svelte,DataTableColumnsMenu.svelte,types.ts,columns.ts,index.ts}`                                                                                       | #3.                                                                                                                                                                                                                           | 23, 24               |
| `src/lib/components/data/{IdentityCell,IdChip,BackLink,RowActionsMenu,SearchInput,StatusChips}.svelte`                                                                                                                                             | #20, #21, #6.                                                                                                                                                                                                                 | 25, 26               |
| `src/routes/(dev)/data-table-bench/+page.svelte`, `+page.server.ts`                                                                                                                                                                                | 1,000-row perf bench (dev and test builds only).                                                                                                                                                                              | 24                   |
| `tests/e2e/{preferences-ssr,locale-ssr,shell-layouts,customizer,tenant-context-banner,data-table}.spec.ts`                                                                                                                                         | Behaviour specs.                                                                                                                                                                                                              | 1, 3, 11, 15, 12, 24 |

### Deleted

| Path                                                                                                                                        | Replaced by                          | Task   |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------ |
| inline `<script>` in `src/app.html`; `src/lib/hooks/use-theme.svelte.ts`; its re-exports in `src/lib/hooks/index.ts`                        | preferences feature + SSR attributes | 1      |
| `src/styles/base.css` customiser section (lines 225–358)                                                                                    | `semantic.css`, `layouts.css`        | 2, 11  |
| `ui/{aspect-ratio,button-group,combobox,context-menu,date-picker,form,hover-card,kbd,menubar,navigation-menu,tree}`, `ui/InlineEdit.svelte` | dead (L16)                           | 5      |
| vaul-svelte internals of `ui/drawer`                                                                                                        | shim over `ui/sheet` (L17)           | 4      |
| `src/lib/layouts/SettingsModal.svelte`                                                                                                      | `ThemeCustomizer.svelte`             | 15     |
| `src/lib/layouts/Sidebar.svelte` internals, `Topbar.svelte` internals, `AppShell.svelte` internals                                          | rebuilt in place                     | 10–12  |
| legacy colour aliases, glass tokens and the old shadcn `:root` block in `tokens.css`; `src/styles/utilities.css` glass classes              | semantic tokens                      | 16     |
| `features/users/...` and `features/operator/...` hand-rolled tables and toolbars                                                            | DataTable + ResourceListPage         | 26, 27 |

### Modified (main ones)

- `src/app.html`, `src/hooks.server.ts`, `src/hooks.client.ts`, `src/app.d.ts`
- `src/routes/+layout.{svelte,server.ts}`, `src/routes/(app)/+layout.{svelte,server.ts}`, `src/routes/(auth)/+layout.svelte`
- `src/lib/i18n/index.ts`
- `src/lib/layouts/*`
- `components/form/*` (rebuilt internals, same props)
- `scripts/arch/{check-tokens,check-token-contrast,check-component-inventory}.mjs`, plus new gates
- `playwright.config.ts`, `tests/visual/fixtures/stability.ts`, `tests/a11y/routes.spec.ts`
- `CLAUDE.md` (Task 31)

### Primitive → replacement map

| Today                                       | After Phase 2                                                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/drawer` (vaul)                          | `ui/sheet` (bits Dialog + busy veto); `ui/drawer` = shim (L17); stable features use `FormSheet`                                         |
| `ui/dialog` (busy)                          | regenerated `ui/dialog`, busy veto re-applied; stable forms use `FormDialog`                                                            |
| `ui/ConfirmDialog` on Dialog                | `ui/ConfirmDialog` on regenerated `ui/alert-dialog` + `confirmDisabled`; reasons use `ReasonConfirmDialog`                              |
| `ui/data-table` (hand-rolled)               | `components/data/data-table` (TanStack + virtua); legacy kept for 2 allowlisted files (L18)                                             |
| `ui/pagination` (hand-rolled API)           | regenerated `ui/pagination` parts + `components/data/Pagination.svelte` (same API)                                                      |
| `form/*` on bits directly / native elements | the same props, rebuilt on `ui/{input,textarea,label,select,checkbox,radio-group,switch,popover,command,calendar,range-calendar,field}` |
| `CommandPalette` on bits Dialog             | `ui/command` (`Command.Dialog`)                                                                                                         |
| `SettingsModal` (Drawer)                    | `ThemeCustomizer` (Sheet)                                                                                                               |
| `layouts/Sidebar` (hand-rolled)             | shadcn `sidebar` block + `NavItem`                                                                                                      |
| raw `<table>` in `PersonDetail`             | `DataTable`                                                                                                                             |
| per-page `<h1>` + Topbar `<h1>`             | `PageHeader` (only `<h1>`)                                                                                                              |
| 7 `+error.svelte` bodies                    | `RouteError`                                                                                                                            |

---

## 6. Packages (one place, for owner approval)

| Change                   | Package                                    | Why                                                                                | Task    |
| ------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------- | ------- |
| add                      | `@tanstack/svelte-table@^9`                | Spec §3/§5.6: DataTable engine (sorting, selection, visibility, paginated models). | 23      |
| add                      | `virtua` (latest)                          | Spec §3/§5.6: row virtualisation above 100 rows.                                   | 24      |
| bump                     | `bits-ui` `^2.18.1` → `^2.21`              | Spec §3; the shadcn-svelte 1.8 output targets it.                                  | 4       |
| remove                   | `vaul-svelte`                              | Spec §3; replaced by Sheet (L17).                                                  | 4       |
| not added                | `layerchart`                               | Deferred to the first chart, Phase 3 (L15).                                        | —       |
| not added                | `@testing-library/svelte`                  | Tests use `mount` plus the existing helpers (owner brief).                         | —       |
| owner decides            | remove `sveltekit-superforms` + `formsnap` | Unused after L14. Keep them if the owner reverses L14.                             | 31      |
| owner decides (optional) | `@fontsource-variable/inter`               | Only if the owner wants CLAUDE.md's Inter instead of today's system stack (L13).   | —       |
| tool, not a dependency   | `npx shadcn-svelte@1.8`                    | CLI output is copied in (D2).                                                      | 4–7, 10 |

---

## 7. Task list and checkpoints

| #      | Title                                                                                                                                                                              | Closes                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1      | Preferences: schema, cookie, SSR attributes, context store; inline script deleted                                                                                                  | spec §5.3 plumbing                |
| 2      | Token layer: palettes, semantic `light-dark()`, axes CSS, bridge, contrast gate                                                                                                    | spec §5.1                         |
| 3      | Per-request SSR locale                                                                                                                                                             | debt                              |
| 4      | shadcn regeneration tooling + overlay family (dialog, sheet, drawer shim, alert-dialog, popover, dropdown-menu, command, tooltip, sonner, scroll-area, separator)                  | spec §5.5 (part), §3 vaul removal |
| 5      | Display family (button, badge, alert, card, avatar, skeleton, tabs, breadcrumb, table, pagination, accordion, collapsible, progress, toggle(-group), slider); dead folders deleted | —                                 |
| 6      | Field layer 1: field, input, textarea, label, checkbox, radio-group, switch, select; TextField, PasswordField, NumberInput, Switch, RadioGroup, Select rebuilt; TextareaField      | #8 (part), #11                    |
| 7      | Field layer 2: calendar, range-calendar; Combobox, DatePicker, DateRangePicker, TagInput, FileDropZone rebuilt; bits-only-in-ui gate                                               | #8                                |
| **8**  | **CHECKPOINT 1**                                                                                                                                                                   | —                                 |
| 9      | Legacy token sweep (codemod)                                                                                                                                                       | spec §5.1 migration               |
| 10     | Sidebar on the shadcn sidebar block; NavItem; sizes; mobile Sheet                                                                                                                  | spec §5.4                         |
| 11     | AppShell, layouts.css (5 layouts, content width, nav types), PageContainer, Footer, HorizontalNav                                                                                  | spec §5.2/§5.4                    |
| 12     | Topbar; ContextBanner (tenant context + impersonation)                                                                                                                             | spec §5.4, L24                    |
| 13     | AuthShell split (frame, AuthBrandPanel, AuthBackdrop); landmarks                                                                                                                   | spec §5.4                         |
| 14     | PageHeader, SectionNav, RouteError; one `<h1>` on every route                                                                                                                      | #15, #16                          |
| 15     | ThemeCustomizer                                                                                                                                                                    | spec §5.3                         |
| 16     | Legacy aliases deleted; token, raw-element and import gates                                                                                                                        | spec §8 gates                     |
| **17** | **CHECKPOINT 2**                                                                                                                                                                   | —                                 |
| 18     | FormDialog, FormSheet, useLeaveGuard, createDialogState; first two migrations                                                                                                      | #1, #12, #22, #21 (part)          |
| 19     | FormSheet migrations: CreateTenantDrawer, CreateUserDrawer, ManagerSelectorDrawer, RoleAssignmentDrawer, PermissionOverridesPanel                                                  | #1                                |
| 20     | ConfirmDialog on alert-dialog; ReasonConfirmDialog; 6 reason dialogs migrated                                                                                                      | #2, drift C1                      |
| 21     | ActionForm; tenant forms ×5 + roles/new                                                                                                                                            | #14, #22                          |
| 22     | ActionForm: auth forms + must-change-password; Domiex sign-in card                                                                                                                 | #14                               |
| 23     | DataTable core                                                                                                                                                                     | #3                                |
| 24     | DataTable: virtualisation, keyboard, pagination modes, perf bench                                                                                                                  | #3, spec §5.6 perf                |
| 25     | IdentityCell, IdChip, BackLink, RowActionsMenu                                                                                                                                     | #20, #21                          |
| 26     | List pattern (SearchInput, StatusChips, ResourceListPage, FilterBar on shadcn); Tenants + People lists; PersonDetail                                                               | #6, debt `$derived`               |
| 27     | Users, Roles, PermissionRequests lists; PermissionTree; UserDetailTabs; users/[id]                                                                                                 | #6, L32, debt `$derived`          |
| 28     | Dashboards on StatCard; settings/account pages                                                                                                                                     | #10, B                            |
| **29** | **CHECKPOINT 3**                                                                                                                                                                   | —                                 |
| 30     | Test infrastructure: visual (CSP-safe, matrix, baselines, nav shots), a11y light+dark+customizer, stale preload comments, Storybook                                                | debts                             |
| 31     | CLAUDE.md + doctrine docs                                                                                                                                                          | spec §4.4 / §5                    |
| **32** | **CHECKPOINT 4 (final)**                                                                                                                                                           | —                                 |

**Why this order differs from the brief's suggestion:**

- Task 1 has to build the Phase 1 plumbing first (L1).
- The locale (Task 3) rides on the same `transformPageChunk`, so it moves up from the end.
- The token sweep (Task 9) runs after primitive regeneration, so regenerated files are not swept twice.
- The sweep runs before the shell, and excludes `src/lib/layouts/`, so files about to be rewritten are not swept.
- Alias deletion (Task 16) waits until every consumer has moved.

**Checkpoints:**

- After Task 7: primitives swapped, everything still renders.
- After Task 16: tokens, shell and customizer done; the a11y project should be green here.
- After Task 28: patterns and migrations done.
- After Task 31: final.

---

## 8. Tasks

### Task 1: Preferences — schema, cookie, SSR attributes, context store

**Files:**

- Create:
  - `src/lib/features/preferences/schema.ts`
  - `src/lib/features/preferences/codec.ts`
  - `src/lib/features/preferences/storage.ts`
  - `src/lib/features/preferences/store.svelte.ts`
  - `src/lib/features/preferences/context.ts`
  - `src/lib/features/preferences/legacy.ts`
  - `src/lib/features/preferences/index.ts`
  - `src/lib/features/preferences/api.ts`
  - `src/lib/server/html-shell.ts`
- Modify:
  - `src/app.html`: delete the inline `<script>` and `<meta name="color-scheme">`; write `<html lang="en" %lk.html.attrs%>`. The lang placeholder comes in Task 3.
  - `src/hooks.server.ts`: `handle = sequence(securityHeadersHandle, htmlShellHandle, sessionRefresh)`.
  - `src/app.d.ts`: `Locals.preferences: Preferences`.
  - `src/routes/+layout.server.ts`: also return `preferences: locals.preferences`.
  - `src/routes/+layout.svelte`: create the store, set the context, call legacy cleanup in `onMount`, drop the `theme` effect.
  - `src/lib/layouts/AppShell.svelte` and `src/lib/layouts/SettingsModal.svelte`: use `getPreferences()`.
  - `src/routes/(dev)/styleguide/+page.svelte`: swap `PRIMARY_COLORS`/`theme` for `PREFERENCE_VALUES.colors`/`getPreferences()`.
  - `src/styles/base.css`:
    - `:root[data-sidebar-collapsed]` → `:root[data-sidebar='small']`
    - `:root[data-primary='green'|'orange'|'teal']` → `:root[data-colors='…']`
    - delete the other `data-primary` blocks; the full colour CSS is Task 2
  - `src/lib/hooks/index.ts`: remove the use-theme exports.
- Delete: `src/lib/hooks/use-theme.svelte.ts`.
- Test:
  - `tests/unit/preferences/codec.test.ts`
  - `tests/unit/preferences/store.test.ts`
  - `tests/unit/server/html-shell.test.ts`
  - `tests/unit/config/app-html.test.ts` (extend)
  - `tests/e2e/preferences-ssr.spec.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces (later tasks rely on these exact names):

```ts
// schema.ts
export const PREFERENCE_VALUES = {
	layout: ['vertical', 'horizontal', 'modern', 'boxed', 'semibox'],
	navType: ['default', 'floating', 'boxed', 'pattern'],
	contentWidth: ['default', 'fluid'],
	sidebar: ['large', 'medium', 'small'],
	mode: ['light', 'dark', 'auto', 'black-white'],
	colors: ['leadkart', 'green', 'violet', 'orange', 'teal', 'fuchsia', 'lime', 'amber'],
	sidebarColors: ['light', 'dark', 'brand', 'purple', 'sky'],
	darkPalette: ['default', 'zinc', 'stone', 'neutral', 'gray']
} as const;
export type PreferenceKey = keyof typeof PREFERENCE_VALUES;
export type Preferences = { [K in PreferenceKey]: (typeof PREFERENCE_VALUES)[K][number] };
export const DEFAULT_PREFERENCES: Readonly<Preferences>; // values per L2
export const PREFERENCE_ATTRIBUTES: Readonly<Record<PreferenceKey, string>>;
// layout→'data-layout', navType→'data-nav-type', contentWidth→'data-content-width', sidebar→'data-sidebar',
// mode→'data-mode', colors→'data-colors', sidebarColors→'data-sidebar-colors', darkPalette→'data-dark-palette'
export const preferencesSchema: z.ZodType<Preferences>; // every field z.enum(...).catch(default); the object .catch(defaults)

// codec.ts
export const PREFERENCES_COOKIE = 'lk_ui';
export const PREFERENCES_COOKIE_MAX_AGE = 31_536_000;
export function encodePreferences(p: Preferences): string; // base64url(JSON.stringify({ v: 1, ...p }))
export function decodePreferences(raw: string | null | undefined): Preferences; // never throws
export function htmlAttributes(p: Preferences): string; // 'data-layout="vertical" data-nav-type="default" …' (8 pairs, schema order)

// storage.ts
export interface PreferencesStorage {
	read(): Preferences;
	write(p: Preferences): void;
}
export function cookieStorage(doc?: Document): PreferencesStorage;

// store.svelte.ts
export interface PreferencesStore extends Readonly<Preferences> {
	readonly all: Preferences;
	set(patch: Partial<Preferences>): void; // updates state, storage.write, reflects attributes on <html>
	reset(): void; // DEFAULT_PREFERENCES
}
export function createPreferences(
	initial: Preferences,
	storage?: PreferencesStorage, // default: cookieStorage() in the browser, a no-op on the server
	root?: () => HTMLElement | null // default: () => document.documentElement in the browser
): PreferencesStore;

// context.ts: Svelte 5 createContext (svelte ≥5.40 returns [get, set, has])
export const [getPreferences, setPreferences] = createContext<PreferencesStore>();

// legacy.ts
export function removeLegacyThemeKeys(): void; // leadkart-primary, leadkart-content-width, leadkart-sidebar-collapsed; try/catch

// server/html-shell.ts
export const htmlShellHandle: Handle; // sets event.locals.preferences; transformPageChunk replaces %lk.html.attrs%
```

`decodePreferences` rules:

- `raw` missing → defaults.
- Length > 400 → defaults.
- base64url decode fails → defaults.
- `JSON.parse` fails → defaults.
- Otherwise `preferencesSchema.parse(obj)`, which falls back per field.
- Decode with `atob` after mapping `-_` → `+/` and padding. Encode with `btoa` and strip `=`. The JSON is ASCII-only.

`api.ts` exports nothing but a doc comment ("preferences never call the API; storage is the cookie"). It exists only because `check-feature-structure` requires `api.ts` and `index.ts` in every feature folder.

- [ ] **Step 1: Write the failing codec and schema tests** (`tests/unit/preferences/codec.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import {
	decodePreferences,
	encodePreferences,
	htmlAttributes
} from '#lib/features/preferences/codec.ts';
import { DEFAULT_PREFERENCES } from '#lib/features/preferences/schema.ts';

const b64 = (s: string) => btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

describe('preferences codec', () => {
	it('round-trips every field', () => {
		const p = {
			...DEFAULT_PREFERENCES,
			layout: 'semibox',
			mode: 'dark',
			colors: 'teal',
			darkPalette: 'zinc'
		} as const;
		expect(decodePreferences(encodePreferences(p))).toEqual(p);
	});
	it('stays under 300 bytes for the longest values', () => {
		const p = {
			layout: 'horizontal',
			navType: 'floating',
			contentWidth: 'default',
			sidebar: 'medium',
			mode: 'black-white',
			colors: 'leadkart',
			sidebarColors: 'purple',
			darkPalette: 'neutral'
		} as const;
		expect(`lk_ui=${encodePreferences(p)}`.length).toBeLessThanOrEqual(300);
	});
	it.each([undefined, null, '', '%%%not-base64', b64('not json'), b64('[1,2]'), 'x'.repeat(401)])(
		'falls back to defaults for %s',
		(raw) => expect(decodePreferences(raw as string)).toEqual(DEFAULT_PREFERENCES)
	);
	it('falls back per field and ignores unknown keys', () => {
		const raw = b64(
			JSON.stringify({ v: 1, mode: 'dark', colors: 'blue', layout: '"><script>', extra: 1 })
		);
		expect(decodePreferences(raw)).toEqual({ ...DEFAULT_PREFERENCES, mode: 'dark' });
	});
	it('writes exactly the 8 attributes from the enum', () => {
		expect(htmlAttributes(DEFAULT_PREFERENCES)).toBe(
			'data-layout="vertical" data-nav-type="default" data-content-width="default" data-sidebar="large" ' +
				'data-mode="light" data-colors="leadkart" data-sidebar-colors="light" data-dark-palette="default"'
		);
	});
});
```

- [ ] **Step 2: Write the failing store test** (`tests/unit/preferences/store.test.ts`)

It needs a fake storage (`{ read: vi.fn(), write: vi.fn() }`) and a detached `<html>`-like element as `root`. Assertions:

- `createPreferences(DEFAULT_PREFERENCES, storage, () => el)` reads `layout` as `'vertical'`.
- `set({ mode: 'dark' })` updates `store.mode`, calls `storage.write` with the full object, and sets `el.getAttribute('data-mode') === 'dark'`.
- `reset()` writes the defaults and restores all 8 attributes.
- `set({ mode: 'nope' as never })` is ignored: state and attribute stay unchanged and `write` is not called. Each patch value is validated against `PREFERENCE_VALUES`.

- [ ] **Step 3: Write the failing server handle test** (`tests/unit/server/html-shell.test.ts`, node project)

Build an event stub `{ cookies: { get: (n) => n === 'lk_ui' ? raw : undefined }, locals: {}, request: new Request('http://x/') }` and a `resolve` that records `opts`. Assert:

- `event.locals.preferences` equals the decoded value.
- `opts.transformPageChunk({ html: '<html lang="en" %lk.html.attrs%>', done: true })` returns `<html lang="en" data-layout="semibox" … data-mode="dark" …>` for a cookie holding semibox + dark.
- For `raw = '"><script>alert(1)</script>'` the output contains no `<script` and equals the default attributes.

- [ ] **Step 4: Extend `tests/unit/config/app-html.test.ts`**

Assert that the file:

- contains `%lk.html.attrs%`
- contains no `<script`
- contains no `localStorage`
- contains no `name="color-scheme"`

- [ ] **Step 5: Run the tests to see them fail**

Run: `npx vitest run tests/unit/preferences tests/unit/server/html-shell.test.ts tests/unit/config/app-html.test.ts`
Expected: FAIL (modules not found; app.html still has the script).

- [ ] **Step 6: Implement** the modules listed under Interfaces.
  - `htmlShellHandle` reads `event.cookies.get(PREFERENCES_COOKIE)` and decodes it. It returns `resolve(event, { transformPageChunk: ({ html }) => html.replace('%lk.html.attrs%', htmlAttributes(prefs)) })`.
  - `cookieStorage.write` sets `` `${PREFERENCES_COOKIE}=${encodePreferences(p)}; Path=/; Max-Age=${PREFERENCES_COOKIE_MAX_AGE}; SameSite=Lax` `` and appends `; Secure` when `location.protocol === 'https:'`.
  - `cookieStorage.read` parses `document.cookie`.
  - In `routes/+layout.svelte`, run `const prefs = setPreferences(createPreferences(data.preferences));` at the top of the script, then `onMount(removeLegacyThemeKeys)`.
  - AppShell's hamburger becomes `prefs.set({ sidebar: prefs.sidebar === 'small' ? 'large' : 'small' })`.
  - SettingsModal keeps its two groups (colour, content width), now reading from `PREFERENCE_VALUES`. It is replaced in Task 15.
  - Remove the inline `style="background: {colour.hex}"` swatches: render `<span class="lk-swatch" data-swatch={id}>`, and add `.lk-swatch[data-swatch='x'] { background: var(--palette-x-500) }` rules to `base.css`. Where the palette var does not exist yet, use `var(--color-brand-500)`; Task 2 adds the palette vars.

- [ ] **Step 7: Run the unit tests to see them pass**

Run: `npx vitest run tests/unit/preferences tests/unit/server/html-shell.test.ts tests/unit/config/app-html.test.ts`
Expected: PASS.

- [ ] **Step 8: Write and run the e2e** `tests/e2e/preferences-ssr.spec.ts`. Each test:
  - (a) `page.context().addCookies([{ name: 'lk_ui', value: <encoded semibox + dark>, url: 'http://localhost:4173' }])`, then `const res = await page.request.get('/signin')`; the raw `await res.text()` contains `data-layout="semibox"` and `data-mode="dark"` on `<html`.
  - (b) The response CSP header has no `'unsafe-inline'` in `script-src`, and the HTML contains no `<script>` without `nonce=`.
  - (c) Sign in with `signInAsTier`, open the SettingsModal, and click the button named "Fluid". Then `page.request.get('/dashboard')`; it shares the context's cookies. The raw HTML must contain `data-content-width="fluid"`, which proves the cookie was written and is rendered at SSR.

  Run: `npm run build && CI=1 npx playwright test tests/e2e/preferences-ssr.spec.ts tests/e2e/security-headers.spec.ts tests/e2e/ssr-isolation.spec.ts tests/e2e/role-aware-shell.spec.ts --project=chromium --retries=0`
  Expected: PASS.

- [ ] **Step 9: Fast checks.** Run `npm run check && npm run arch:check`, plus prettier and eslint on the changed files.

- [ ] **Step 10: Commit.** Message: `feat(prefs): one preferences schema in the lk_ui cookie, rendered on <html> at SSR; the inline theme script and localStorage keys are gone`

---

### Task 2: Token layer — palettes, semantic `light-dark()`, axes CSS, bridge, contrast gate

**Files:**

- Create: `src/styles/theme/palettes.css`, `src/styles/theme/semantic.css`, `tests/e2e/tokens-parity.spec.ts`.
- Modify:
  - `src/styles/index.css`: import `./theme/palettes.css` and `./theme/semantic.css` before `tokens.css`.
  - `src/styles/tokens.css`:
    - legacy colour names become aliases (4.3)
    - delete the old shadcn `:root` block and the duplicate `--color-primary/secondary/border/radius-*` definitions
    - one `--radius: 0.75rem`
    - the full `@theme inline` bridge
  - `src/app.css`: the `dark` custom variant (4.4).
  - `src/styles/base.css`: delete every `data-primary` and `data-colors` block (L6); `body` keeps `bg-background text-foreground`.
  - `scripts/arch/check-token-contrast.mjs`: rewrite (4.5).
  - `scripts/arch/check-tokens.mjs`: glob `src/styles/**/*.css`.

**Interfaces:**

- Consumes: the Task 1 attributes.
- Produces: the token names in 4.2 and the utilities `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-accent`, `bg-primary`, `bg-primary-soft`, `bg-secondary`, `bg-destructive(-soft)`, `bg-{success,warning,info}(-soft)`, `text-*-foreground`, `border-border`, `border-input`, `ring-ring`, `bg-sidebar*`, `text-sidebar*`, `--palette-*`, `--primary-50..950`, `--primary-solid`, `--dark-*`.
- Theme reference: `DOMIEX/src/lib/css/components/theme.css`, `DOMIEX/src/lib/css/themes-color/{primary-color,sidebar-color,dark-color}.css`, `DOMIEX/src/lib/css/components/helper.css` (body).

- [ ] **Step 1: Characterise today's look (failing-first parity test).** Write `tests/e2e/tokens-parity.spec.ts`.
  - It visits `/styleguide`, which is in the `(dev)` group, so no sign-in is needed, and `/signin`.
  - It reads `getComputedStyle` for `document.body` (backgroundColor, color), the first `button` (backgroundColor, color, borderRadius) and the first `[data-slot="card"]`, or the first `.rounded-lg` element (backgroundColor, borderColor, borderRadius).
  - Run it once on the unmodified tree with `console.log(JSON.stringify(values))`, paste the printed values into an `expected` object, and assert `toEqual(expected)`.
  - Run: `npm run build && CI=1 npx playwright test tests/e2e/tokens-parity.spec.ts --project=chromium --retries=0`. Expected: PASS on the old tree; this pins the look.

- [ ] **Step 2: Write the failing contrast gate.** Rewrite `check-token-contrast.mjs` per 4.5, before `semantic.css` exists.
      Run: `node scripts/arch/check-token-contrast.mjs`
      Expected: FAIL with "src/styles/theme/semantic.css not found".

- [ ] **Step 3: Create `palettes.css` and `semantic.css`** per 4.1 and 4.2.
  - Start every non-default colour block with `--primary-solid` at the L10 start step.
  - Start the `purple` and `sky` sidebar blocks from the Domiex values (L12).

- [ ] **Step 4: Run the gate, adjust steps until green.**
      Run: `node scripts/arch/check-token-contrast.mjs`
  - For each failing `primary-foreground / primary`, move that colour's `--primary-solid` one step darker; in dark mode use `--primary-300`.
  - For each failing sidebar pair, use the next Tailwind step for the foreground.
  - Record the final solid step per colour in a comment table at the top of `semantic.css`.
    Expected: PASS for all 400 combinations (8 × 2 × 5 × 5).

- [ ] **Step 5: Wire the bridge and aliases** in `tokens.css` and the dark variant in `app.css`. Delete the old `@custom-variant dark (&:is(.dark *))`.

- [ ] **Step 6: Verify parity and the new modes.**
  - Re-run `tokens-parity.spec.ts`. It must pass, because the light values are unchanged (L9). If the radius differs, set `--radius` to the value the parity test recorded.
  - Add two tests to the same spec:
    - (a) With cookie `mode=dark`, the body `backgroundColor` equals the computed `--dark-950`.
    - (b) With cookie `mode=auto` and `page.emulateMedia({ colorScheme: 'dark' })`, the body background is dark. After `emulateMedia({ colorScheme: 'light' })` it is light again without a reload. This is the "auto follows the OS with no JS" check.
  - Run: `npm run build && CI=1 npx playwright test tests/e2e/tokens-parity.spec.ts tests/e2e/preferences-ssr.spec.ts tests/e2e/a11y.spec.ts --project=chromium --retries=0`
  - Expected: PASS.

- [ ] **Step 7: Fast checks.** `npm run check && npm run arch:check && npm run lint:css`.

- [ ] **Step 8: Commit.** Message: `feat(tokens): one semantic layer with shadcn names; light, dark and auto via light-dark(); 8 primaries, 5 dark palettes, 5 sidebar colours; contrast gate over every combination`

---

### Task 3: Per-request SSR locale

**Files:**

- Modify:
  - `src/lib/i18n/index.ts`
  - `src/lib/server/html-shell.ts`: negotiate the locale; `%lk.html.lang%`
  - `src/app.html`: `<html lang="%lk.html.lang%" %lk.html.attrs%>`
  - `src/app.d.ts`: `Locals.locale: AppLocale`
  - `src/hooks.server.ts`: `init` preloads both dictionaries
  - `src/hooks.client.ts`: `initI18n(readDocumentLocale())`
  - `src/routes/+layout.server.ts`: return `locale`
  - `src/routes/+layout.svelte`: on the server, `locale.set(data.locale)` before any child renders
- Test:
  - `tests/unit/i18n/negotiate.test.ts`
  - `tests/unit/server/html-shell.test.ts` (extend)
  - `tests/e2e/locale-ssr.spec.ts`

**Interfaces:**

- Produces:

```ts
// src/lib/i18n/index.ts
export const SUPPORTED_LOCALES = ['en', 'hi'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export function negotiateLocale(acceptLanguage: string | null): AppLocale; // highest-q supported primary subtag; ties by order; default 'en'
export function initI18n(initialLocale: AppLocale): void; // client: register lazy loaders; server: addMessages(en), addMessages(hi) synchronously
export function readDocumentLocale(): AppLocale; // <html lang> if supported, else 'en'
```

- [ ] **Step 1: Write the failing tests.** `negotiateLocale`:
  - `'hi-IN,hi;q=0.9,en;q=0.8'` → `'hi'`
  - `'en-GB,hi;q=0.5'` → `'en'`
  - `'fr'` → `'en'`
  - `null` → `'en'`
  - `'hi;q=0,en'` → `'en'`
  - In the handle test, `Accept-Language: hi` produces `<html lang="hi"`.

- [ ] **Step 2: Run them to see them fail.**
      Run: `npx vitest run tests/unit/i18n tests/unit/server/html-shell.test.ts`
      Expected: FAIL.

- [ ] **Step 3: Implement.**
  - On the server, import `en.json` and `hi.json` statically inside the `typeof window === 'undefined'` branch of `initI18n` and call `addMessages` for each, with no `register()` loaders. With no loader queue, `locale.set` stays synchronous.
  - In `routes/+layout.svelte`: `import { browser } from '$app/env'; if (!browser) locale.set(data.locale);` as the first statement of the script.
  - Comment the reason: Svelte SSR renders the tree in one synchronous pass, so the global store cannot be changed by another request mid-render.

- [ ] **Step 4: Write the e2e** `tests/e2e/locale-ssr.spec.ts`.
  - (a) Sign in, then `page.request.get('/settings/tenant/profile', { headers: { 'accept-language': 'hi' } })`. The HTML has `<html lang="hi"` and contains the Hindi value of `tenant.profile.title`, read from `src/lib/i18n/locales/hi.json`.
  - (b) Fire 10 interleaved requests alternating `hi`/`en` with `Promise.all`. Each response's `lang` and title match its own header.
  - (c) After `goto` with `hi`, the visible heading text is Hindi immediately after `domcontentloaded`, with no English frame. Assert `page.locator('h1')` has the Hindi text before `html[data-hydrated="true"]` appears.

  Run: `npm run build && CI=1 npx playwright test tests/e2e/locale-ssr.spec.ts tests/e2e/ssr-isolation.spec.ts tests/e2e/tenant-settings.spec.ts --project=chromium --retries=0`
  Expected: PASS.

- [ ] **Step 5: Fast checks**, then commit. Message: `fix(i18n): the server renders the request's language; <html lang> matches; no English-then-Hindi flash`

---

### Task 4: shadcn regeneration tooling + overlay family

**Files:**

- Create:
  - `scripts/shadcn/normalize.mjs`
  - `src/lib/components/ui/CUSTOMIZATIONS.md`
  - `tests/unit/components/sheet-busy.test.ts`
  - `tests/unit/stubs/SheetHost.svelte`
  - `tests/unit/scripts/shadcn-normalize.test.ts`
- Regenerate (CLI, `--overwrite`): `dialog`, `sheet`, `alert-dialog`, `popover`, `dropdown-menu`, `command`, `tooltip`, `sonner`, `scroll-area`, `separator`.
- Modify:
  - `ui/dialog/dialog.svelte`: re-apply the busy veto
  - `ui/sheet/sheet.svelte`: add the same busy veto
  - `ui/drawer/*`: replace with a shim
  - `ui/index.ts`
  - `src/lib/utils/cn.ts`: add `WithoutChild` and `WithoutChildrenOrChild`
  - `src/routes/+layout.svelte`: mount `<Toaster />` and keep `<Tooltip.Provider>` once
  - `src/routes/(app)/+layout.svelte`: remove `<Toaster />`
  - `src/lib/features/search/components/CommandPalette.svelte`: move onto `ui/command`
  - `src/lib/layouts/AppShell.svelte`: the mobile drawer becomes `<Sheet.Root><Sheet.Content side="left">`
  - `package.json`: bump `bits-ui` to `^2.21`; remove `vaul-svelte`
  - `tests/unit/stubs/DrawerHost.svelte` (unchanged API; it now drives the shim)
- Theme reference: `DOMIEX/plugins/pixeleyezui/drawer.js` (modal widths, `backdrop-overlay`), `DOMIEX/src/lib/css/plugins/tippy.css` (tooltip).

**Interfaces:**

- Consumes: Task 2 tokens.
- Produces:
  - `ui/sheet` exports `Root` (props `RootProps & { busy?: boolean }`), `Trigger`, `Close`, `Portal`, `Overlay`, `Content` (`side?: 'top' | 'right' | 'bottom' | 'left'` = `'right'`, `showCloseButton?: boolean` = `true`), `Header`, `Body`, `Footer`, `Title` and `Description`, plus the `Sheet*` aliases.
  - `Body` is a LeadKart addition, `<div data-slot="sheet-body" class="flex-1 overflow-y-auto px-6 py-4">`, recorded in CUSTOMIZATIONS.md.
  - `ui/dialog` keeps today's export names plus `busy`.
  - `ui/drawer/index.ts` re-exports the sheet parts as `Root`, `Trigger`, `Content`, `Header`, `Body`, `Footer`, `Title`, `Description`, `Close`, `Overlay` and `Drawer*`.
  - The shim's `Content` defaults to `side="right"`. Its `Root` accepts and ignores vaul-only props (`shouldScaleBackground`, `direction`, `activeSnapPoint`, `dismissible`): `direction='left'` maps to `side`, and `dismissible=false` maps to `busy`-like refusal through `interactOutsideBehavior="ignore"` + `escapeKeydownBehavior="ignore"`.
  - `normalize.mjs`: `node scripts/shadcn/normalize.mjs <files…>`. It is idempotent and rewrites:
    1. `from '#lib/utils/cn'` or `'$lib/utils/cn'` → `'#lib/utils/cn.ts'`.
    2. `import XIcon from '@lucide/svelte/icons/x'` → `import { X as XIcon } from '#lib/icons/index.ts'`. It fails, listing the names, if the registry lacks an icon.
    3. Physical → logical classes inside class strings and `cn(...)` arguments: `ml-`→`ms-`, `mr-`→`me-`, `pl-`→`ps-`, `pr-`→`pe-`, `left-`→`start-`, `right-`→`end-`, `text-left`→`text-start`, `text-right`→`text-end`, `border-l`→`border-s`, `border-r`→`border-e`, `rounded-l`→`rounded-s`, `rounded-r`→`rounded-e`, including `data-[side=right]:` prefixes. It skips `slide-in-from-*` and `slide-out-to-*` animation names.
    4. `$lib/components/ui/` → `#lib/components/ui/`.
    5. Opaque tokens (L37), as exact class rewrites, variant prefixes kept: `hover:bg-primary/90` → `hover:bg-primary-hover`; `hover:bg-destructive/90` → `hover:bg-destructive-hover`; `ring-ring/50` → `ring-ring`; `text-sidebar-foreground/70` → `text-sidebar-muted-foreground`; `dark:bg-input/30` → `dark:bg-input-fill`.
    6. It FAILS (non-zero exit, listing file:line) on any remaining `/<alpha>` modifier on a text, ring, `border-input` or solid-fill colour utility in `src/lib/components/ui/**`. The same rule is the `check-tokens` arch gate; the only allowed alpha is the decorative scrim `bg-black/50`.

- [ ] **Step 1: Write the failing normaliser test.** Feed a fixture string with each pattern from 1–4 and assert the rewritten output. Assert that a second run is a no-op.
      Run: `npx vitest run tests/unit/scripts/shadcn-normalize.test.ts`
      Expected: FAIL (module missing).

- [ ] **Step 2: Implement `normalize.mjs`.** Run the test again; expected PASS.

- [ ] **Step 3: Write the failing `Sheet` busy test.** Copy `tests/unit/components/drawer-busy.test.ts` into `sheet-busy.test.ts`, with `SheetHost.svelte` using `ui/sheet`. It covers Escape, the Close button and outside pointerdown while `busy`, then closing once `busy=false`.
      Run: `npx vitest run tests/unit/components/sheet-busy.test.ts`
      Expected: FAIL (`busy` unsupported).

- [ ] **Step 4: Regenerate.**
  - Run `npx shadcn-svelte@1.8 add dialog sheet alert-dialog popover dropdown-menu command tooltip sonner scroll-area separator --overwrite --yes --no-deps`.
  - If the CLI rejects `components.json` (the `#lib` aliases or `"style": "nova"`), run `npx shadcn-svelte@1.8 init --help`, set `style` to the value it lists, and if aliases are refused set them to `$lib/...` for the run only and revert afterwards. The normaliser fixes the imports. Record what was done in CUSTOMIZATIONS.md.
  - Revert any CLI edit to `src/app.css`: tokens live in `src/styles/theme/`.
  - Run `node scripts/shadcn/normalize.mjs src/lib/components/ui/{dialog,sheet,alert-dialog,popover,dropdown-menu,command,tooltip,sonner,scroll-area,separator}/*.svelte`.

- [ ] **Step 5: Re-apply local edits and document them in CUSTOMIZATIONS.md**, one heading per file with a "why":
  - the `dialog.svelte` and `sheet.svelte` busy veto (copy today's `dialog.svelte` body);
  - `sheet-body.svelte`;
  - `dropdown-menu-trigger` keeps the `child` pattern;
  - the `sonner` Toaster props (`position="bottom-right" richColors closeButton`), with token classes only.

  Write the drawer shim. Bump bits-ui, `npm uninstall vaul-svelte`, then `npm install`.

- [ ] **Step 6: Move CommandPalette onto `Command.Dialog`.** Keep `button[aria-label="Search (Cmd+K)"]`, the `cmd-k-search.spec.ts` flows and the existing groups. Mount Toaster in the root layout (D: spec §5.4), so `(auth)` pages now toast too.

- [ ] **Step 7: Run the unit tests.**
      Run: `npx vitest run tests/unit/components`
      Expected: PASS, including `busy-veto-bound`, `drawer-busy`, `pending-dismissal`, `form-drawer-settle` and the new `sheet-busy`.

- [ ] **Step 8: Run the e2e.**
      Run: `npm run build && CI=1 npx playwright test tests/e2e/cmd-k-search.spec.ts tests/e2e/permission-requests.spec.ts tests/e2e/operator-impersonation.spec.ts tests/e2e/tenant-user-management.spec.ts tests/e2e/inventory.spec.ts tests/e2e/leads.spec.ts --project=chromium --retries=0`
      Expected: PASS. Drawers now render through the shim; update any spec that targeted vaul markup to role selectors.

- [ ] **Step 9: Fast checks** (check, arch, lint:css, prettier/eslint on changed files), then commit. Message: `refactor(ui): regenerated overlay primitives (dialog, sheet, alert-dialog, popover, dropdown, command, tooltip, sonner); busy veto on Dialog and Sheet; vaul removed, Drawer is a Sheet shim; one Toaster and Tooltip provider at the root`

---

### Task 5: Display family + dead folders

**Files:**

- Regenerate (CLI, `--overwrite`): `button`, `badge`, `alert`, `card`, `avatar`, `skeleton`, `tabs`, `breadcrumb`, `table`, `pagination`, `accordion`, `collapsible`, `progress`, `toggle`, `toggle-group`, `slider`.
- Create:
  - `src/lib/components/data/Pagination.svelte`
  - `scripts/codemods/ui-api-renames.mjs`
  - `tests/unit/components/button.test.ts`
  - `tests/unit/components/badge.test.ts`
  - `tests/unit/components/alert-role.test.ts`
  - `tests/unit/components/pagination.test.ts`
- Delete: the L16 dead list.
- Modify:
  - `ui/index.ts`
  - every call site touched by the codemod: Button about 67 files, Badge about 29, Pagination 2
  - `scripts/arch/check-component-inventory.mjs`:
    - required paths now match the lowercase files on disk;
    - remove the deleted primitives;
    - fix the stale "TextField multiline" OPT_OUT comment (TextareaField arrives in Task 6).
- Theme reference:
  - `DOMIEX/plugins/pixeleyezui/buttons.js` and `DOMIEX/src/lib/css/components/buttons.css`: `.btn` is about 40px tall, `px-6`, `rounded-md`. The default size is `h-10 px-6`, `sm` is `h-8 px-3 text-xs`, `lg` is `h-12 px-7`. Map the heights to tokens: `h-10` is `--spacing-10`.
  - `DOMIEX/plugins/pixeleyezui/cards.js`: `.card` has `border`, `rounded-md`, `p-5` body, `card-header` `p-5 border-b`.
  - `DOMIEX/plugins/pixeleyezui/table.js`: cells `px-3 py-3.5 border-b`, header `font-semibold text-start`, the header row on `bg-muted text-muted-foreground`.
  - `DOMIEX/plugins/pixeleyezui/pagination.js`: items `size-9 border rounded-md`.
  - `DOMIEX/plugins/pixeleyezui/breadcrumb.js`.

**Interfaces:**

- Produces:
  - `Button`:
    - shadcn props (`href` renders `<a>`) plus `variant`: `'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'tonal'`;
    - `size`: `'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'`;
    - `loading?: boolean`: shows `Spinner`, sets `aria-busy="true"`, disables the button unless `focusableWhileLoading` (kept);
    - exports `buttonVariants`, `ButtonVariant`, `ButtonSize`.
  - `Badge`: `variant`: `'default' | 'secondary' | 'destructive' | 'outline' | 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand'`. The status variants use soft fills: `bg-{s}-soft text-{s}`; `danger` uses `destructive-soft`; `neutral` uses `bg-muted text-muted-foreground`; `brand` uses `bg-primary-soft text-primary`. Exports `badgeVariants`, `BadgeVariant`.
  - `Alert`: `variant`: `'default' | 'destructive' | 'success' | 'warning' | 'info'`. `role` is `"alert"` for `destructive` and `warning`, and `"status"` otherwise. This is a local edit. The old `danger` maps to `destructive` through the codemod.
  - `components/data/Pagination.svelte`: props `{ page: number; pageCount: number; onChange: (page: number) => void; label?: string }`, the same as today's `ui/pagination` API, built on the regenerated `Pagination.*` parts.
  - `ui-api-renames.mjs`: `node scripts/codemods/ui-api-renames.mjs` applies the L19 renames:
    - Button `variant="primary"|"danger"|"glass"`
    - `size="md"`
    - `fullWidth`
    - Badge `appearance=*`, `size=*`, `variant="danger"` (kept), `appearance="outline"` → `variant="outline"`
    - Alert `variant="danger"` → `"destructive"`
    - `Pagination` imported from `$ui` → `import Pagination from '#lib/components/data/Pagination.svelte'`

    It prints every file changed.

- [ ] **Step 1: Write the failing tests.**
  - Button: `href` renders an `<a>` with no nested `<button>`; `loading` sets `aria-busy` and `disabled`; `variant="tonal"` adds the tonal classes.
  - Badge: `variant="success"` contains `bg-success-soft`.
  - Alert: `role` is `"alert"` for destructive and `"status"` for info.
  - Pagination: clicking "Next" calls `onChange(page + 1)`, and the current page has `aria-current="page"`.

  Run: `npx vitest run tests/unit/components/{button,badge,alert-role,pagination}.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Regenerate, normalise, re-apply.**
  - Regenerate and normalise the family: the CLI then `node scripts/shadcn/normalize.mjs src/lib/components/ui/<each>/*.svelte`.
  - Add the cva extras (`tonal`, `loading`, the badge status variants, the alert role) and document each in CUSTOMIZATIONS.md.

- [ ] **Step 3: Run the codemod.** Then `npm run check` and fix the remaining type errors by hand. Expect about 10 sites with dynamic variants, for example `variant={x ? 'danger' : 'ghost'}`.

- [ ] **Step 4: Delete the dead folders (L16)** and update `ui/index.ts` and `check-component-inventory.mjs`. The `StatCard` and `Progress` REQUIRED entries stay; `InlineEdit`, `Tree` and `Accordion/Accordion.svelte` become lowercase `accordion/accordion.svelte` or are removed.

- [ ] **Step 5: Run the unit tests.**
      Run: `npx vitest run tests/unit/components`
      Expected: PASS.

- [ ] **Step 6: Run the e2e.**
      Run: `npm run build && CI=1 npx playwright test tests/e2e/tenant-roles-management.spec.ts tests/e2e/tenant-user-management.spec.ts tests/e2e/operator-tenant-management.spec.ts tests/e2e/orders.spec.ts tests/e2e/a11y.spec.ts --project=chromium --retries=0`
      Expected: PASS.

- [ ] **Step 7: Fast checks**, then commit. Message: `refactor(ui): regenerated display primitives with shadcn variant names (+tonal, +loading, status badges, role-aware alerts); Button href; dead ui folders deleted`

---

### Task 6: Field layer 1 + TextareaField

**Files:**

- Regenerate (CLI): `field`, `input`, `textarea`, `label`, `checkbox`, `radio-group`, `switch`, `select`.
  - If `npx shadcn-svelte@1.8 add field` reports an unknown component, create `ui/field/` by hand. It has `field.svelte`, `field-label.svelte`, `field-description.svelte` and `field-error.svelte`, each a `data-slot` element with the classes below, and is recorded in CUSTOMIZATIONS.md as hand-written.
- Rebuild (same props as today):
  - `src/lib/components/form/TextField.svelte`
  - `src/lib/components/form/PasswordField.svelte`
  - `src/lib/components/form/NumberInput.svelte`
  - `src/lib/components/form/Switch.svelte`
  - `src/lib/components/form/RadioGroup.svelte`
  - `src/lib/components/form/RadioItem.svelte`
  - `src/lib/components/form/Select.svelte`
- Create: `src/lib/components/form/TextareaField.svelte`.
- Migrate: `src/lib/features/permission-requests/components/PermissionRequestDetail.svelte`, its 2 textareas. The other stable textareas are rewritten in Tasks 18–20, which consume TextareaField; leads/orders/inventory ones are in section 9.
- Test:
  - `tests/unit/components/field-anatomy.test.ts`
  - `tests/unit/components/textarea-field.test.ts`
  - `tests/unit/components/select-field.test.ts`
- Theme reference: `DOMIEX/plugins/pixeleyezui/forms.js`.
  - `.form-input` is `h-10 px-4 border rounded-md`, with the focus border in primary. Keep our `focus-visible` ring as well, which CLAUDE.md requires.
  - `.form-label` is `mb-2 text-sm font-medium`.
  - `DOMIEX/src/routes/(main-layout)/pages-account-settings/AccountSetting.svelte` shows the grid `gap-5`.

**Interfaces:**

- Produces:
  - Field anatomy (one wrapper, replacing 9 copies):

  ```svelte
  <Field.Field>
  	// <div data-slot="field" class="grid gap-2">
  		<Field.Label for={id}>…</Field.Label> //
  		<label class="text-sm font-medium">
  			{control}
  			<Field.Description id="{id}-hint">…</Field.Description> // text-sm text-muted-foreground
  			<Field.Error id="{id}-error">…</Field.Error> // role="alert" text-sm text-destructive
  		</label>
  	</div></Field.Field
  >
  ```

  - Every rebuilt field:
    - keeps its current props, for example `TextField: label, srLabel?, hint?, error?, id?, value (bindable), leading?, trailing?` plus `HTMLInputAttributes`;
    - derives `id` from `$props.id()` when none is passed, so ids never come from the label;
    - sets `aria-describedby` to the ids of the present hint, error and counter;
    - sets `aria-invalid` when `error`.
  - `TextareaField` (the Task 15 brief API, kept): `{ label: string; name: string; value: string (bindable); rows?: number = 3; maxlength?: number; hint?: string; error?: string | null; required?: boolean; placeholder?: string; disabled?: boolean; id?: string }`. It shows a counter `"{n}/{max}"` (`aria-live="polite"`) when `maxlength` is set, and is built on `ui/textarea`.
  - `Select` keeps `options: SelectOption[]`, `placeholder?` and a bindable `value`. It stays a **native `<select>`** styled like Domiex `.form-select`: `h-10 ps-3 pe-10`, a chevron drawn as a CSS `background-image` from an inline SVG data URI that uses `currentColor` via a mask, and the field tokens (L36). The regenerated `ui/select` (bits) is generated because spec §5.5 lists it, but no Phase 2 field uses it.

- [ ] **Step 1: Write the failing tests.**
  - field-anatomy: a TextField with `hint` and `error` has `aria-describedby` containing both ids; the error has `role="alert"`; two TextFields with the same label get different ids.
  - textarea-field: typing 3 characters with `maxlength=10` shows "3/10"; `aria-describedby` includes the counter id; `error` sets `aria-invalid="true"`.
  - select-field: dispatching `change` after setting `select.value` updates the bound value; `error` sets `aria-invalid="true"`; the `<select>` is labelled by its visible label. `tests/e2e/role-hierarchy.spec.ts` keeps using `selectOption`.

  Run: `npx vitest run tests/unit/components/{field-anatomy,textarea-field,select-field}.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Regenerate and normalise.** Then rebuild the seven form components on `ui/*` and `Field.*`, and create TextareaField.

- [ ] **Step 3: Migrate the PermissionRequestDetail textareas to TextareaField.**

- [ ] **Step 4: Run the unit tests.**
      Run: `npx vitest run tests/unit/components tests/unit/features`
      Expected: PASS.

- [ ] **Step 5: Run the e2e.**
      Run: `npm run build && CI=1 npx playwright test tests/e2e/account-self-service.spec.ts tests/e2e/tenant-settings.spec.ts tests/e2e/permission-requests.spec.ts tests/e2e/forgot-password.spec.ts tests/e2e/auth-must-change-and-lockout.spec.ts tests/e2e/inventory.spec.ts tests/e2e/orders.spec.ts tests/e2e/leads.spec.ts --project=chromium --retries=0`
      Expected: PASS. Specs use `input[name=…]`, `input[aria-invalid]` and `input[role="spinbutton"]`; the rebuilt fields keep those attributes.

- [ ] **Step 6: Fast checks**, then commit. Message: `refactor(form): one field anatomy (label, hint, error with stable ids); fields rebuilt on regenerated inputs; TextareaField`

---

### Task 7: Field layer 2 + bits-only-in-ui gate

**Files:**

- Regenerate (CLI): `calendar`, `range-calendar`.
- Rebuild (same props):
  - `src/lib/components/form/Combobox.svelte` (on `ui/popover` + `ui/command`)
  - `src/lib/components/form/DatePicker.svelte` (`ui/popover` + `ui/calendar`)
  - `src/lib/components/form/DateRangePicker.svelte` (`ui/popover` + `ui/range-calendar`)
  - `src/lib/components/form/TagInput.svelte` (`ui/input` + `ui/badge` + `Field`; visible label required)
  - `src/lib/components/form/FileDropZone.svelte` (Field + tokens)
- Create:
  - `scripts/arch/check-bits-ui-boundary.mjs`
  - `scripts/arch/check-banned-packages.mjs`
  - `tests/unit/components/combobox.test.ts`
  - `tests/unit/components/tag-input.test.ts`
- Modify: `scripts/arch/run-all.mjs` (register the gates).

**Interfaces:**

- Produces:
  - `check-bits-ui-boundary.mjs` fails on any `from 'bits-ui'` outside `src/lib/components/ui/**`.
  - `check-banned-packages.mjs` fails on any import of `vaul-svelte`, `lucide-svelte` or `mode-watcher` under `src/` and `tests/`, and on their presence in `package.json`.
  - Combobox, DatePicker, DateRangePicker, TagInput and FileDropZone keep their current props.
  - TagInput additionally requires `label` and no longer uses the placeholder as its label (catalogue B).

- [ ] **Step 1: Write the failing tests.**
  - combobox: typing filters the options; Enter selects; `onValueChange` is called; the listbox has an accessible name.
  - tag-input: Enter adds a tag; Backspace on an empty input removes the last tag; the input is labelled by the visible label.

  Run: `npx vitest run tests/unit/components/{combobox,tag-input}.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Write the gates and check they bite.**
      Run: `node scripts/arch/check-bits-ui-boundary.mjs`
      Expected: FAIL, listing `form/{Combobox,DatePicker,DateRangePicker}` (RadioGroup and Switch are already moved in Task 6).

- [ ] **Step 3: Regenerate and normalise calendar and range-calendar.** Then rebuild the five components.

- [ ] **Step 4: Run the tests and gates.**
      Run: `npx vitest run tests/unit/components && npm run arch:check`
      Expected: PASS.

- [ ] **Step 5: Run the e2e.**
      Run: `npm run build && CI=1 npx playwright test tests/e2e/inventory.spec.ts tests/e2e/leads.spec.ts tests/e2e/orders.spec.ts --project=chromium --retries=0`
      Expected: PASS. These are the Combobox, DatePicker and TagInput consumers.

- [ ] **Step 6: Fast checks**, then commit. Message: `refactor(form): pickers, combobox and tag input on regenerated primitives; bits-ui is imported only by lib/components/ui (gate); banned packages gate`

---

### Task 8: CHECKPOINT 1 — primitives swapped

**Files:** whatever the failures point to. No new features.

- [ ] **Step 1: Run the full gates.**
      `npm run verify && npm run test && npm run build && npm run storybook:build`
      Record the pass/fail of each.

- [ ] **Step 2: Run the full browser suites.**
      `CI=1 npx playwright test --project=chromium --retries=0` and `CI=1 npx playwright test --project=a11y --retries=0`
      Record the counts. a11y is expected to stay red only for headings, landmarks and the skip link (fixed in Tasks 12–14).

- [ ] **Step 3: Fix every regression** against the pre-Phase-2 baseline: chromium 195 pass / 0 fail / 1 skip, per `.superpowers/sdd/progress.md` "fix round 8". Find root causes; do not loosen tests. A Storybook failure in `ui/kanban/Kanban.stories.svelte` (defineMeta) is known and pre-existing. Fix it here if it blocks the build: match the `defineMeta` form used by `src/lib/components/data/Toolbar.stories.svelte`.

- [ ] **Step 4: Commit each fix separately**, as `fix(<scope>): …`, then report the counts and the fixes to the controller.

---

### Task 9: Legacy token sweep (codemod)

**Files:**

- Create: `scripts/codemods/tokens-to-semantic.mjs`, `tests/unit/scripts/tokens-codemod.test.ts`.
- Modify: every file under `src/` that matches, except:
  - the generated `src/lib/components/ui/<folders>`. It **does** include the LeadKart composites listed in L16.
  - `src/lib/layouts/**` (rewritten in Tasks 10–15)
  - `src/styles/theme/**`
  - `src/styles/tokens.css`

**Interfaces:**

- Produces: `node scripts/codemods/tokens-to-semantic.mjs [--dry]`, which applies the L7 table.
  - In class strings (`class=`, `class:`, `cn(`, `cva(`, template literals in `.svelte` and `.ts`): the utilities, including variant prefixes (`hover:`, `focus-visible:`, `dark:`, `data-[…]:`, `group-hover:`) and opacity suffixes (`/50`).
  - In CSS (`<style>` blocks and `src/styles/*.css`): `var(--color-bg)`→`var(--background)`, `--color-bg-elevated`→`--card`, `--color-bg-subtle|muted`→`--muted`, `--color-fg`→`--foreground`, `--color-fg-muted|subtle`→`--muted-foreground`, `--color-fg-on-brand|--color-primary-fg`→`--primary-foreground`, `--color-border`→`--border`, `--color-border-strong`→`--input`, `--color-focus-ring`→`--ring`, `--color-primary`→`--primary`, `--color-primary-soft`→`--primary-soft`, `--color-brand-N`→`--primary-N`, `--color-{success,warning,info}-N` → per L7 step rules, `--color-danger-N` → `--destructive(-soft)`.
  - Output: per file `path: n replacements`, then a final list of **unmapped** legacy occurrences (dynamic strings) with file:line. Exit 0.

- [ ] **Step 1: Write the failing codemod test.** It covers a fixture with:
  - `class="text-fg-muted hover:bg-bg-muted dark:border-border-strong ring-focus-ring/50"`
  - `cn('bg-bg-elevated', x && 'text-danger-700 bg-danger-50')`
  - `<style>.x { color: var(--color-fg-subtle); }</style>`
  - `class="bg-primary-hover text-primary-fg"`

  It asserts the exact rewritten strings and that a second run is a no-op.
  Run: `npx vitest run tests/unit/scripts/tokens-codemod.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement and run the test.**
      Run: `npx vitest run tests/unit/scripts/tokens-codemod.test.ts`
      Expected: PASS.

- [ ] **Step 3: Run the codemod on the tree** with `node scripts/codemods/tokens-to-semantic.mjs`. Fix every "unmapped" line by hand, using the same table.

- [ ] **Step 4: Prove the result.**
  - `npm run check`.
  - `npx vitest run`, all client tests: snapshot or class assertions that named legacy utilities are updated to the new names.
  - Grep: `rg -n "(bg-bg|text-fg|--color-(bg|fg|brand)|ring-focus-ring|primary-fg|border-strong)" src --glob '!src/lib/layouts/**' --glob '!src/styles/tokens.css'` must return nothing.

- [ ] **Step 5: Run the e2e.**
      Run: `npm run build && CI=1 npx playwright test tests/e2e/tokens-parity.spec.ts tests/e2e/a11y.spec.ts tests/e2e/tenant-settings.spec.ts tests/e2e/leads.spec.ts tests/e2e/orders.spec.ts tests/e2e/inventory.spec.ts --project=chromium --retries=0`
      Expected: PASS.
  - `tokens-parity` may now differ only where `fg-subtle` collapsed into `muted-foreground` (L7). If a parity probe hits such an element, move the probe to an element whose colour is unchanged, and note it in the commit body.

- [ ] **Step 6: Fast checks**, then commit. Message: `refactor(tokens): every component reads the semantic tokens (codemod, ~1,600 sites); legacy names left only as aliases`

---

### Task 10: Sidebar on the shadcn sidebar block

**Files:**

- Regenerate (CLI): `sidebar`. It brings `src/lib/hooks/is-mobile.svelte.ts` and `ui/sidebar/context.svelte.ts`.
- Create:
  - `src/lib/layouts/NavItem.svelte`
  - `tests/unit/components/sidebar-nav.test.ts`
  - `tests/unit/config/nav-active.test.ts`
- Modify:
  - `src/lib/layouts/Sidebar.svelte`: full rewrite.
  - `src/lib/config/nav.ts`: export `VisibleNavItem`; add `isNavActive`.
  - `src/routes/(app)/operator/scope/+layout.svelte`: use `isNavActive`.
  - `src/lib/components/ui/CUSTOMIZATIONS.md`.
- Theme reference:
  - `DOMIEX/src/lib/components/layout-components/sidebar/{Sidebar,SidebarNew,SidebarItem}.svelte`
  - `DOMIEX/plugins/layouts/sidebar.js`:
    - nav-link `px-4 py-2.5 text-15 rounded-md`; hover and active change only the text colour at large size; `/10` background at medium and small
    - section title `px-4 py-2 text-xs uppercase`
    - medium: icon above a centred label; small: icon-only
    - icons `size-4` at large, `size-5` at medium and small
  - `DOMIEX/src/lib/css/components/theme.css`: widths.

**Interfaces:**

- Consumes:
  - `getPreferences()` (Task 1)
  - `visibleNav`, `NAV_ICONS`
  - `session.capabilities` and `session.inTenantContext`
- Produces:

```ts
// nav.ts
export interface VisibleNavItem {
	key: NavRouteKey;
	href: ResolvedPathname;
	label: string;
}
export function isNavActive(pathname: string, href: string): boolean; // exact or `${href}/` prefix
```

- `NavItem.svelte` props: `{ item: VisibleNavItem; active: boolean; variant: 'sidebar' | 'menu'; onNavigate?: () => void }`.
  - `sidebar` renders `Sidebar.MenuButton` (with `isActive` and a `tooltipContent` label) wrapping an `<a>` through the `child` snippet.
  - `menu` renders a `DropdownMenu.Item` wrapping an `<a>` through the `child` snippet; it is used by HorizontalNav in Task 11.
- `Sidebar.svelte` props: `{ onNavigate?: () => void }`.
  - It renders `Sidebar.Root collapsible="icon"`, the brand header (shown only in `modern`/`semibox`, via CSS in Task 11), and one `Sidebar.Group` with a `Sidebar.GroupLabel` per section.
  - `aria-label="Main navigation"` stays on the `<nav>`.
- Sizes come from CSS: `--sidebar-width` is `15rem` for large and `10rem` for medium; `--sidebar-width-icon` is `4.6875rem`.
- Local edits to the generated block, each documented in CUSTOMIZATIONS.md:
  1. `context.svelte.ts`: rewrite `class SidebarState` as a factory `createSidebarState(props)` returning getters. `check-no-class-stores` bans classes in `*.svelte.ts`.
  2. `is-mobile.svelte.ts`: rewrite `class IsMobile` as `export function createIsMobile(breakpoint = 1024): MediaQuery`, with the breakpoint set at `lg` per spec §5.2.
  3. `sidebar-provider.svelte`:
     - delete the `document.cookie` write;
     - delete the inline `--sidebar-width` and `--sidebar-width-icon` style vars, since widths come from `layouts.css`;
     - `open` becomes controlled: `open={prefs.sidebar !== 'small'}` and `onOpenChange={(o) => prefs.set({ sidebar: o ? 'large' : 'small' })}`.
  4. `sidebar.svelte`: the fixed container uses `top-(--shell-sidebar-top) bottom-(--shell-sidebar-bottom) start-(--shell-sidebar-start)` instead of `inset-y-0 h-svh`.

- [ ] **Step 1: Write the failing tests.**
  - `nav-active`:
    - `isNavActive('/leads/1', '/leads')` → true
    - `isNavActive('/leads-archive', '/leads')` → false
  - `sidebar-nav`: mock `$app/state` with page url `/settings/users`, and `$features/auth` with `session` whose capabilities see Team and Roles. Mount `Sidebar` inside a host stub, `tests/unit/stubs/SidebarHost.svelte`. The host calls `setPreferences(createPreferences(prefs, fakeStorage, () => el))` and wraps the sidebar in the controlled `Sidebar.Provider`, exactly as AppShell will. Assert:
    - the Team link has `aria-current="page"`;
    - section labels render;
    - with `sidebar: 'small'`, each link still has an accessible name (`aria-label` or tooltip trigger label) and `[data-state="collapsed"]` is present;
    - the `tenantContext` section is never rendered, as today.

  Run: `npx vitest run tests/unit/components/sidebar-nav.test.ts tests/unit/config/nav-active.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Regenerate, normalise and apply the local edits.** Then rewrite `Sidebar.svelte` and `NavItem.svelte`. AppShell's own mobile `Sheet` (Task 4) is removed: below `lg` the block renders as a Sheet itself.

- [ ] **Step 3: Run the tests and gates.**
      Run: `npx vitest run tests/unit/components/sidebar-nav.test.ts tests/unit/config && npm run arch:check`
      Expected: PASS.

- [ ] **Step 4: Run the e2e.**
      Run: `npm run build && CI=1 npx playwright test tests/e2e/role-aware-shell.spec.ts tests/e2e/hover-preload.spec.ts tests/e2e/server-capability-guards.spec.ts --project=chromium --retries=0`
      Expected: PASS.

- [ ] **Step 5: Fast checks**, then commit. Message: `feat(shell): sidebar on the shadcn sidebar block; large/medium/small from preferences; icon-only with tooltips; sheet below lg`

---

### Task 11: AppShell, layouts.css, PageContainer, Footer, HorizontalNav

**Files:**

- Create:
  - `src/styles/theme/layouts.css`
  - `src/lib/layouts/PageContainer.svelte`
  - `src/lib/layouts/HorizontalNav.svelte`
  - `tests/unit/components/horizontal-nav.test.ts`
  - `tests/e2e/shell-layouts.spec.ts`
- Modify:
  - `src/lib/layouts/AppShell.svelte`
  - `src/lib/layouts/Footer.svelte`
  - `src/styles/index.css` (import `theme/layouts.css`)
  - `src/styles/base.css`: delete the `--lk-*` shell vars and the `data-layout`, `data-sidebar*` and `data-content-width` blocks
- Theme reference:
  - `DOMIEX/src/routes/(main-layout)/+layout.svelte`
  - `DOMIEX/plugins/layouts/{others,topbar,boxed,semibox,horizontal,footer}.js`
  - `DOMIEX/src/lib/css/layouts/{topbar,horizontal}.css`
  - `DOMIEX/src/lib/components/common/Footer.svelte`

**Interfaces:**

- Consumes: `getPreferences().layout`, the Task 10 Sidebar and NavItem, and `visibleNav`.
- Produces:
  - `layouts.css` vars on `:root`. These are the only shell geometry source; Topbar (Task 12) reads them.
    - `--shell-topbar-height: 4.6875rem`
    - `--shell-footer-height: 3.5rem`
    - `--shell-gap: 0rem`
    - `--shell-radius: 0rem`
    - `--shell-sidebar-top: var(--shell-topbar-height)`
    - `--shell-sidebar-bottom: 0rem`
    - `--shell-sidebar-start: 0rem`
    - `--shell-topbar-start: 0rem`
    - `--shell-topbar-inset: 0rem`
    - `--shell-content-start: var(--sidebar-width)`
    - `--shell-page-pad-top: calc(var(--shell-topbar-height) * 1.2)`
    - `--shell-page-pad-x: var(--spacing-5)`, and `7rem` at xl
    - `--shell-boxed-margin: 0rem`
    - `--shell-boxed-canvas: transparent`
    - `--shell-content-max: none`
  - Overrides:
    - `:root[data-layout='modern']`: sidebar top 0; the topbar starts at the sidebar width.
    - `:root[data-layout='boxed']`:
      - `--shell-boxed-margin: var(--spacing-8)`
      - `--shell-boxed-canvas: var(--primary-500)`
      - radius `rounded-md` on the panes
    - `:root[data-layout='semibox']`:
      - `--shell-gap: var(--spacing-3)`
      - `--shell-radius: 0.375rem`
      - bordered panes
      - sidebar top, bottom and start = gap
      - topbar start = `calc(var(--sidebar-width) + 2 * gap)`
      - page pad-top `calc(topbar * 1.3)`
    - `:root[data-layout='horizontal']`:
      - `--shell-content-start: 0rem`
      - page pad-top `calc(topbar * 1.9)` at lg
    - `:root[data-sidebar='small']`: `--shell-content-start: var(--sidebar-width-icon)`.
    - `:root[data-content-width='fluid']`: `--shell-page-pad-x: var(--spacing-5)` at every width; semibox + fluid uses `--spacing-3`.
    - `:root[data-nav-type='floating']`: topbar `position: absolute`.
    - `:root[data-nav-type='boxed']`: topbar inset `var(--spacing-3)`, bordered and rounded.
    - `:root[data-nav-type='pattern']`: band and dot overlay, white text (L22).
    - The `data-nav-type` rules apply only when `:not([data-layout='horizontal'])`.
    - Below `lg`, `--shell-content-start: 0` and the sidebar and nav-type geometry are ignored.
  - `AppShell.svelte` renders, in order:
    1. `Sidebar.Provider`
    2. `{#if prefs.layout === 'horizontal'}<HorizontalNav/>{:else}<Sidebar/>{/if}`
    3. `<Topbar/>`
    4. `<main id="main-content" tabindex="-1"><PageContainer>{children}</PageContainer></main>`
    5. `<Footer/>`

    Task 12 inserts `<TenantContextBanner/>` between Topbar and main.

  - `PageContainer.svelte` props: `{ children: Snippet }`. It applies `--shell-page-pad-*`; the max-width is `--container-2xl` when `contentWidth=default` and none when fluid.
  - `HorizontalNav.svelte` props: none. It renders `<nav aria-label="Main navigation">`, using `DropdownMenu` per titled section and a direct link for untitled sections. Items are `NavItem variant="menu"`. The active section trigger has `aria-current="true"`.
  - `Footer.svelte` uses Domiex markup: `h-(--shell-footer-height)`, `border-t`, `text-muted-foreground`, the year and "LeadKart". It is not fixed: it sits at the end of `.lk-shell-content` with `margin-top: auto`. Domiex's absolute footer overlaps long pages; that is a plan decision.

- [ ] **Step 1: Write the failing tests.**
  - horizontal-nav: with operator and administration sections visible, it renders one dropdown trigger per titled section and a direct `Dashboard` link; opening "Administration" lists Team and Roles as links.
  - `tests/e2e/shell-layouts.spec.ts`: for each `layout` in `PREFERENCE_VALUES.layout`, set the `lk_ui` cookie, sign in as tenant-admin and visit `/settings/users`.
    - At 1280×800: `main#main-content` does not overlap the sidebar or topbar. Its bounding box `x` is ≥ the sidebar's right edge, except in horizontal; its `y` is ≥ the topbar's bottom edge.
    - In `horizontal`: there is no `[data-slot="sidebar"]`, and `nav[aria-label="Main navigation"]` contains the dropdown triggers.
    - In `semibox`: the sidebar box has `x > 0`.
    - At 390×844: the sidebar is hidden, and the topbar toggle opens a dialog containing the nav.

  Run: `npx vitest run tests/unit/components/horizontal-nav.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement `layouts.css`, AppShell, PageContainer, HorizontalNav and Footer.**

- [ ] **Step 3: Run the unit test.**
      Run: `npx vitest run tests/unit/components/horizontal-nav.test.ts`
      Expected: PASS.

- [ ] **Step 4: Run the e2e.**
      Run: `npm run build && CI=1 npx playwright test tests/e2e/shell-layouts.spec.ts tests/e2e/role-aware-shell.spec.ts tests/e2e/preferences-ssr.spec.ts --project=chromium --retries=0`
      Expected: PASS.

- [ ] **Step 5: Fast checks**, including `npm run lint:css` (stylelint plus strict values). Then commit. Message: `feat(shell): five Domiex layouts, content width and nav types in CSS; horizontal nav from the same nav config; one PageContainer`

---

### Task 12: Topbar + ContextBanner (tenant context, impersonation)

**Files:**

- Create:
  - `src/lib/layouts/ContextBanner.svelte`
  - `src/lib/layouts/TenantContextBanner.svelte`
  - `tests/unit/components/tenant-context-banner.test.ts`
  - `tests/unit/server/app-layout-tenant-context.test.ts`
  - `tests/e2e/tenant-context-banner.spec.ts`
- Modify:
  - `src/lib/layouts/Topbar.svelte`: rewrite.
  - `src/lib/layouts/UserMenu.svelte`: tokens and regenerated dropdown.
  - `src/lib/features/operator/impersonation/components/ImpersonationBanner.svelte`: render through ContextBanner.
  - `src/lib/layouts/AppShell.svelte`: render `<TenantContextBanner/>` between `<Topbar/>` and `<main>`.
  - `src/routes/(app)/+layout.svelte`: the ImpersonationBanner moves inside AppShell's banner slot, directly after TenantContextBanner. It is still inside `QueryClientProvider`.
  - `src/routes/(app)/+layout.server.ts`: add `tenantContext`.
  - `src/routes/(app)/operator/scope/+layout.svelte`: remove the Exit button and the tenant `<h1>` block; the banner and PageHeader replace them in Task 14.
  - `src/lib/i18n/locales/{en,hi}.json`: `shell.*` keys.
- Theme reference:
  - `DOMIEX/src/lib/components/layout-components/Topbar.svelte`:
    - toggle `size-9`
    - search box `w-72` with icon at start
    - right cluster `gap-2`, `.topbar-link size-9`
  - `DOMIEX/plugins/layouts/topbar.js`.

**Interfaces:**

- Consumes:
  - `exitScopeMutation()` from `features/operator/scope/queries.ts`, the one exit flow
  - `impersonation` store
  - `getPreferences()`
  - `useSidebar()` from the shadcn block
- Produces:

```ts
// (app)/+layout.server.ts return gains:
tenantContext: { displayName: string; isPlatform: boolean } | null; // from readOperatorScope(): display_name, slug === 'platform'
```

- `ContextBanner.svelte` props: `{ tone: 'warning' | 'destructive'; icon: LucideIcon; label: string; children: Snippet; action?: Snippet }`.
  - It renders `<div role="region" aria-label={label}>` in `bg-{tone}-soft text-{tone}`, sticky under the topbar at `top: var(--shell-topbar-height)`, with `z-index: var(--z-banner)`.
  - It spans the content column and is never hidden by the sidebar size or layout.
- `TenantContextBanner.svelte` props: none. It reads `page.data.tenantContext`.
  - When the value is non-null it renders `ContextBanner tone="warning" icon={Building2} label={$_('shell.tenantContext.region')}`.
  - The text is `$_('shell.tenantContext.actingIn', { values: { tenant: displayName } })`, plus a `Badge variant="brand"` "Platform" when `isPlatform`.
  - The action is `Button variant="outline" size="sm" loading={exit.isPending} onclick={() => exit.mutate()}` with the label `$_('shell.tenantContext.exit')`.
- `Topbar.svelte` props: `{ onOpenCustomizer: () => void }`.
  - Left: `Sidebar.Trigger` (`aria-label` = `$_('shell.toggleSidebar')`; on mobile it opens the sheet), the logo where the layout shows it, and the search trigger. The search trigger keeps `aria-label="Search (Cmd+K)"` and opens CommandPalette.
  - Right: the mode toggle (`aria-label` = `$_('shell.toggleMode')`, Sun/Moon), the customizer button (`aria-label` = `$_('shell.openCustomizer')`), and UserMenu.
  - No Bell, no breadcrumb, no heading.
  - It is a `<header>` landmark.

Mode toggle logic (L25):

```ts
const resolvedDark =
	prefs.mode === 'dark' ||
	(prefs.mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
prefs.set({ mode: resolvedDark ? 'light' : 'dark' });
```

- [ ] **Step 1: Write the failing tests.**
  - server: given a valid scope cookie for slug `platform` / display name `LeadKart Platform`, the load returns `tenantContext: { displayName: 'LeadKart Platform', isPlatform: true }`. With no cookie it returns `null`. The JSON of the returned data contains neither the tenant id nor the slug. Follow the structure of `tests/unit/server/app-layout.test.ts`.
  - component: mock `$app/state` with `page.data.tenantContext = { displayName: 'Acme', isPlatform: false }` and `withRealMutations` for the exit mutation. The region named `$_('shell.tenantContext.region')` shows "Acme"; clicking Exit calls `exitTenantContext` once and the button shows `aria-busy` while pending. With `tenantContext = null` nothing renders.

  Run: `npx vitest run tests/unit/server/app-layout-tenant-context.test.ts tests/unit/components/tenant-context-banner.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement** the load change, ContextBanner, TenantContextBanner, the Topbar rewrite, the ImpersonationBanner refactor and the scope-layout trim.

- [ ] **Step 3: Write the e2e** `tests/e2e/tenant-context-banner.spec.ts`.
  - Enter a tenant from `/operator/tenants`, using the flow in `operator-tenant-management.spec.ts`. Run it for each `layout ∈ {vertical, horizontal}` × `sidebar ∈ {large, small}` (set via cookie), and also for `layout=boxed` + `navType=pattern` and at a 390px viewport. In each case:
    - the region "Tenant context" is visible on `/operator/scope/profile` and `/operator/scope/members`;
    - Tab reaches the Exit button;
    - activating Exit lands on `/operator/tenants` with no banner.
  - Run: `npm run build && CI=1 npx playwright test tests/e2e/tenant-context-banner.spec.ts tests/e2e/operator-tenant-management.spec.ts tests/e2e/scope-cross-tab.spec.ts tests/e2e/operator-impersonation.spec.ts tests/e2e/cmd-k-search.spec.ts --project=chromium --retries=0`
  - Expected: PASS.

- [ ] **Step 4: Fast checks** (locale parity is part of `arch:check`), then commit. Message: `feat(shell): Domiex topbar (no heading, no bell); one context banner shows the tenant an operator acts in, with the one exit, on every layout`

---

### Task 13: AuthShell split + auth landmarks

**Files:**

- Create: `src/lib/layouts/AuthBrandPanel.svelte`, `src/lib/layouts/AuthBackdrop.svelte`, `tests/unit/components/auth-shell.test.ts`.
- Modify: `src/lib/layouts/AuthShell.svelte`, which shrinks to the frame.
- Theme reference: `DOMIEX/src/routes/auth-signin-basic/BasicSignIn.svelte`. Use its card, `md:p-10` padding, centred column and `gap-5` form grid, inside our existing split frame (L35).

**Interfaces:**

- Produces:
  - `AuthShell.svelte` props: `{ children: Snippet }`. It renders `<AuthBackdrop/>`, a brand `<aside aria-label="LeadKart">` holding `<AuthBrandPanel/>`, and `<main id="main-content" tabindex="-1">{children}</main>`.
  - `AuthBackdrop.svelte`: the particle field and blobs, `aria-hidden="true"`. Under `@media (prefers-reduced-motion: reduce)` all animation is removed and the field is static. Colours come only from `--primary-*` and `--background`.
  - `AuthBrandPanel.svelte`: the brand copy and feature bullets, from today's lines 239–290. Strings use `auth.brand.*` i18n keys, or keep today's keys if present.
  - Each file stays ≤300 LOC (`check-loc-budgets`).

- [ ] **Step 1: Write the failing test.** The mounted AuthShell has exactly one `main#main-content`, one `aside[aria-label]`, the backdrop with `aria-hidden="true"`, and no `<h1>`; the page form owns the `<h1>`.
      Run: `npx vitest run tests/unit/components/auth-shell.test.ts`
      Expected: FAIL.

- [ ] **Step 2: Split the file.** Move the CSS with each part and swap the legacy colour literals and glass tokens for semantic tokens.

- [ ] **Step 3: Run the tests.**
  - Run: `npx vitest run tests/unit/components/auth-shell.test.ts`
  - Then: `npm run build && CI=1 npx playwright test tests/e2e/forgot-password.spec.ts tests/e2e/auth-must-change-and-lockout.spec.ts tests/e2e/email-change.spec.ts --project=chromium --retries=0`
  - Then: `CI=1 npx playwright test tests/a11y/routes.spec.ts --project=a11y --grep "unauthenticated" --retries=0`
  - Expected: PASS. The unauthenticated a11y group goes green here.

- [ ] **Step 4: Fast checks**, then commit. Message: `refactor(auth-shell): frame, brand panel and backdrop split; auth pages have a main landmark the skip link reaches; reduced motion stops the particles`

---

### Task 14: PageHeader, SectionNav, RouteError — one `<h1>` per route

**Files:**

- Create:
  - `src/lib/layouts/PageHeader.svelte`
  - `src/lib/layouts/SectionNav.svelte`
  - `src/lib/components/feedback/RouteError.svelte`
  - `tests/unit/components/page-header.test.ts`
  - `tests/unit/components/section-nav.test.ts`
  - `tests/unit/components/route-error.test.ts`
- Modify:
  - Every `+error.svelte`:
    - `routes/(app)`
    - `routes/(app)/settings/account`
    - `routes/(app)/settings/tenant`
    - `routes/(app)/operator/scope`
    - `routes/(auth)`
    - `routes/(dev)`
    - `routes/+error.svelte`: keep its no-JS sign-out form; use RouteError for the body.
  - `routes/(app)/settings/account/+layout.svelte`, `settings/tenant/+layout.svelte` and `operator/scope/+layout.svelte`: SectionNav replaces their tab markup.
  - Every page or component that renders a page-level `<h1>`:
    - `features/dashboard/components/*Dashboard.svelte`
    - `features/permission-requests/components/{PermissionRequestsList,PermissionRequestDetail}.svelte`
    - `features/roles/components/RolesList.svelte`
    - `features/inventory/components/ProductDetailHeader.svelte`
    - `features/leads/components/LeadDetailHeader.svelte`
    - `features/orders/components/OrderDetailHeader.svelte` (the `data-testid="order-number"` stays on the `<h1>`)
    - `components/data/ResourceListPage.svelte`
    - the routes using `Breadcrumbs`: `operator/persons/[id]`, `settings/roles/[id]`, `settings/roles/new`, `settings/users`, `settings/users/[id]`, and the three layouts above
  - `src/lib/components/ui/index.ts`: drop the old `Breadcrumbs` re-export once unused.
  - `src/lib/utils/routeTitle.ts`: kept. `PageHeader` uses `routeContext(pathname).crumbs` as the default trail.
- Theme reference:
  - `DOMIEX/src/lib/components/common/PageHeading.svelte` and `DOMIEX/plugins/layouts/page-heading.js`: `flex items-center mb-3`; the title is `h6` size, semibold; the breadcrumb is on the end side, items `text-muted-foreground`, the active item `text-foreground`, separated by chevrons.
  - `DOMIEX/src/routes/pages-404/+page.svelte`, for the error copy structure only: no illustration and no gradient (fillers carry no design intent).

**Interfaces:**

- Produces:

```ts
// PageHeader.svelte props
type Crumb = { label: string; href?: string };
{
	title: string;
	description?: string;
	crumbs?: Crumb[]; // default: routeContext(page.url.pathname).crumbs; [] hides the trail
	actions?: Snippet;
	meta?: Snippet; // badges next to the title (e.g. status, "Platform")
}
// renders <div class="lk-page-heading"><div><h1 class="h6 font-semibold">{title}</h1>{meta}<p>{description}</p></div>
//         <nav aria-label="Breadcrumb"><ol>…<li aria-current="page">{title}</li></ol></nav>{actions}</div>
// SectionNav.svelte props
{ tabs: Array<{ href: string; label: string; icon?: LucideIcon }>; label: string } // <nav aria-label={label}>, active via isNavActive, aria-current="page"
// RouteError.svelte props
{ status: number; message?: string; homeHref: string; homeLabel: string; signInHref?: string }
// Card + Alert(destructive) with status-aware copy: 404 → $_('errors.route.notFound'), 403 → $_('errors.route.forbidden'),
// else $_('errors.route.generic'); actions are <Button href> (no <a><Button>)
```

- [ ] **Step 1: Write the failing tests.**
  - page-header: exactly one `h1`, with the title text; the breadcrumb `nav[aria-label="Breadcrumb"]` ends in an `aria-current="page"` item; `crumbs=[]` renders no nav.
  - section-nav: the active tab has `aria-current="page"`; the links are `<a>`.
  - route-error: status 404 shows the not-found copy; the home action is an `<a href>` with button classes and no `<button>` inside the `<a>`.

  Run: `npx vitest run tests/unit/components/{page-header,section-nav,route-error}.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement the three components.** Then migrate every listed file.
  - For the list components, ResourceListPage renders `PageHeader`, so its users get it for free.
  - For leads/orders/inventory, only the header markup is swapped; nothing else changes.

- [ ] **Step 3: Add a route-walk heading test** to `tests/a11y/routes.spec.ts`. On every route already listed there, `await expect(page.locator('h1')).toHaveCount(1)`.
      Run: `npm run build && CI=1 npx playwright test --project=a11y --retries=0`
      Expected: the heading, landmark and skip-link violations are gone. Record the remaining failures, which are contrast only; Task 16 and Checkpoint 2 own them.

- [ ] **Step 4: Run the e2e.**
      Run: `CI=1 npx playwright test tests/e2e/a11y.spec.ts tests/e2e/orders.spec.ts tests/e2e/tenant-settings.spec.ts tests/e2e/account-self-service.spec.ts tests/e2e/operator-tenant-management.spec.ts --project=chromium --retries=0`
      Expected: PASS.

- [ ] **Step 5: Fast checks**, then commit. Message: `feat(ui): PageHeader (the only h1, Domiex page heading with breadcrumb), SectionNav for settings and tenant-context tabs, RouteError for every error page`

---

### Task 15: ThemeCustomizer

**Files:**

- Create:
  - `src/lib/layouts/customizer-config.ts`
  - `src/lib/layouts/ThemeCustomizer.svelte`
  - `src/lib/layouts/CustomizerTile.svelte`
  - `tests/unit/layouts/customizer-config.test.ts`
  - `tests/unit/components/theme-customizer.test.ts`
  - `tests/e2e/customizer.spec.ts`
- Modify:
  - `src/lib/layouts/AppShell.svelte`: lazy-load `ThemeCustomizer` exactly as `SettingsModal` was.
  - `src/lib/i18n/locales/{en,hi}.json`: `customizer.*` keys.
  - `src/styles/base.css`: swatch classes move to `CustomizerTile`'s `<style>`, using `var(--palette-*-500)`, `var(--neutral-*-950)` and the sidebar colour tokens.
- Delete: `src/lib/layouts/SettingsModal.svelte`.
- Theme reference: `DOMIEX/src/lib/components/layout-components/SettingsModal.svelte` and `DotIndicators.svelte`.
  - Wireframe tiles are `h-28`, with a dot bar and a 12-column sidebar span.
  - Swatches are `size-10 rounded-full`; the checked state is a ring offset by 2.
  - The grid is `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5`.
  - Footer: a Reset button. There is no "Buy now" button.

**Interfaces:**

- Consumes: `PREFERENCE_VALUES`, `getPreferences()`.
- Produces:

```ts
// customizer-config.ts
export type TileKind = 'wireframe' | 'swatch';
export interface CustomizerGroup<K extends PreferenceKey = PreferenceKey> {
	key: K;
	titleKey: string; // i18n key, e.g. 'customizer.layout.title'
	kind: TileKind;
	options: ReadonlyArray<{ value: Preferences[K]; labelKey: string; hideBelow?: 'lg' }>;
	visible?: (p: Preferences) => boolean;
}
export const CUSTOMIZER_GROUPS: ReadonlyArray<CustomizerGroup>; // built by mapping PREFERENCE_VALUES — order:
// layout, navType, contentWidth, sidebar, mode, darkPalette, sidebarColors, colors (Domiex order, minus direction)
// visibility per L25; layout options 'modern' and 'semibox' have hideBelow 'lg'
export function visibleGroups(p: Preferences): CustomizerGroup[];
```

- `ThemeCustomizer.svelte` props: `{ open: boolean (bindable); onOpenChange: (o: boolean) => void }`.
  - It renders `Sheet.Root` → `Sheet.Content side="right" class="w-full sm:max-w-[52rem]"`. The `52rem` is Domiex's `modal-xl`; add `--customizer-width: 52rem` to `layouts.css` and use `max-w-(--customizer-width)`.
  - Then `Sheet.Header` (Title `$_('customizer.title')`), one `fieldset` per visible group with a `legend`, and inside it `RadioGroup.Root` (regenerated `ui/radio-group`) of `CustomizerTile`s.
  - `Sheet.Footer` holds `Button variant="outline"` Reset, which calls `prefs.reset()`.
- `CustomizerTile.svelte` props: `{ group: PreferenceKey; value: string; label: string; kind: TileKind }`. It is a `RadioGroup.Item` whose child renders either a wireframe preview (pure CSS, keyed by `data-preview="{group}-{value}"`) or a swatch (`data-swatch="{group}-{value}"`), followed by the visible label.

- [ ] **Step 1: Write the failing tests.**
  - config:
    - every key of `PREFERENCE_VALUES` has exactly one group;
    - every value appears once in its group;
    - `visibleGroups({ ...DEFAULT_PREFERENCES, layout: 'horizontal' })` excludes `navType`, `sidebar` and `sidebarColors`;
    - `visibleGroups(DEFAULT_PREFERENCES)` excludes `darkPalette`;
    - `visibleGroups({ ...DEFAULT_PREFERENCES, mode: 'dark' })` includes `darkPalette`;
    - every `titleKey` and `labelKey` exists in `en.json` and in `hi.json`.
  - component:
    - choosing the "Dark" tile calls `store.set({ mode: 'dark' })` and sets `data-mode="dark"` on the root element;
    - each group is a `radiogroup` with an accessible name;
    - Reset restores every attribute to the defaults.

  Run: `npx vitest run tests/unit/layouts/customizer-config.test.ts tests/unit/components/theme-customizer.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement.**

- [ ] **Step 3: Write the e2e** `tests/e2e/customizer.spec.ts`.
  - Open the customizer from the topbar and pick: Layout "Semibox", Mode "Dark", Primary "Teal".
  - The `<html>` attributes update with no reload.
  - Reload: the SSR HTML (`page.request.get`) already carries them.
  - Then Reset, and check that every attribute is back to its default.
  - Add a test for the topbar mode button: light → dark → light.
  - Run: `npm run build && CI=1 npx playwright test tests/e2e/customizer.spec.ts tests/e2e/preferences-ssr.spec.ts --project=chromium --retries=0`
  - Expected: PASS.

- [ ] **Step 4: Fast checks**, then commit. Message: `feat(shell): ThemeCustomizer — every Domiex axis from one config derived from the schema; radio tiles; reset`

---

### Task 16: Legacy aliases deleted; token, raw-element and import gates

**Files:**

- Modify:
  - `src/styles/tokens.css`: delete the legacy colour aliases, the glass tokens, `--bg-bg-muted-bg`, and the coloured shadow tokens that reference legacy names. Re-point `--shadow-brand*` to `var(--primary)`.
  - `src/styles/utilities.css` and `src/styles/animations.css`: delete the glass classes; re-point the remaining refs.
  - `scripts/arch/check-tokens.mjs`: extend.
- Create:
  - `scripts/arch/check-raw-elements.mjs`
  - `scripts/arch/check-legacy-imports.mjs`
  - `scripts/arch/allowlists/phase2-rebuild-pending.json`

**Interfaces:**

- Produces:
  - `check-tokens.mjs` additionally fails on:
    - (a) any `--color-(bg|fg|brand)`, `--color-border-strong`, `--color-focus-ring`, `--color-primary-(fg|hover|active)`, or `glass-` declaration or reference in `src/`;
    - (b) any class token matching `\b(?:[a-z-]+:)*(bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|shadow|caret|accent)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|brand|danger|success|warning|info|secondary|logo|black|white)(?:-\d{2,3})?(?:\/\d+)?\b` in `src/**/*.{svelte,ts}`.

    Rule (b) excludes `src/styles/**` and the CLI-generated folders under `src/lib/components/ui/`, which keep shadcn's own `text-white` / `bg-black/50` overlay classes so a quarterly `--overwrite` diff stays clean. It does **not** exclude the LeadKart composites in `ui/` listed in L16. Everywhere else, `text-white` and `bg-black/N` must become semantic tokens (`text-primary-foreground`, `bg-foreground/N`).

  - `check-raw-elements.mjs` fails on `<table`, `<textarea`, `<select` and `<input` (unless `type="hidden"`) in `src/lib/features/**/*.svelte` and `src/routes/**/*.svelte`, except files listed in `allowlists/phase2-rebuild-pending.json` under `rawElements`.
  - `check-legacy-imports.mjs` fails on imports of `#lib/components/ui/drawer`, `$ui/drawer`, `Drawer` from `$ui`, and `#lib/components/ui/data-table` / `DataTable` from `$ui`, outside the allowlist's `drawer` and `legacyDataTable` lists.
  - `phase2-rebuild-pending.json` has the shape `{ rawElements: string[]; drawer: string[]; legacyDataTable: string[] }`. Fill each list from the gate's first failing run. Every path must be under `features/{leads,orders,inventory}`, `routes/(app)/{leads,orders,inventory}`, or the stable files that Tasks 18–27 rewrite.
  - Each stable file in an allowlist carries a `"// removed by Task N"` note in a sibling `notes` object. The task that rewrites the file removes it from the list; Task 29 asserts that no stable file is left.

- [ ] **Step 1: Write the gates and see them fail.**
      Run: `node scripts/arch/check-tokens.mjs; node scripts/arch/check-raw-elements.mjs; node scripts/arch/check-legacy-imports.mjs`
      Expected: FAIL. Use the failures to fill the allowlist. Do not allowlist token violations; fix them.

- [ ] **Step 2: Delete the aliases.** Fix every resulting `check-tokens` and `npm run check` error with the L7 mapping.

- [ ] **Step 3: Run the gates and checks.**
      Run: `npm run arch:check && npm run lint:css && npm run check`
      Expected: PASS.

- [ ] **Step 4: Run the e2e.**
      Run: `npm run build && CI=1 npx playwright test tests/e2e/tokens-parity.spec.ts tests/e2e/a11y.spec.ts tests/e2e/shell-layouts.spec.ts --project=chromium --retries=0`
      Expected: PASS. Update the parity probe values only where Task 11 intentionally changed the shell; list them in the commit body.

- [ ] **Step 5: Commit.** Message: `chore(tokens): legacy colour names and glass tokens deleted; gates for legacy tokens, palette utilities, raw form elements and legacy primitive imports (rebuild-pending allowlist)`

---

### Task 17: CHECKPOINT 2 — tokens, shell, customizer

- [ ] **Step 1: Run the full gates.** Run the Task 8 Step 1 commands, plus `npm run size` (informational: record the JS and CSS gzip figures).

- [ ] **Step 2: Run the full chromium and a11y suites.** a11y must now be green. For contrast failures, fix the token (`semantic.css`) and re-run `check-token-contrast`; never fix contrast per component.
  - Add dark mode to the a11y run now: in `tests/a11y/routes.spec.ts`, run every test twice via a `for (const mode of ['light', 'dark'])` loop that sets the `lk_ui` cookie in `beforeEach`.
  - Add one test that opens the ThemeCustomizer and runs axe on the open dialog.

- [ ] **Step 3: Fix the regressions** and commit each fix separately. Then do CLAUDE.md's "tunnel vision check". Take screenshots of `/dashboard` and `/settings/users` in light and dark at 1280 and 390 widths (`page.screenshot` into the scratchpad, not committed). Compare their spacing, sizes and structure with the Domiex sources named in Tasks 10–14, which are read-only; do not install or run Domiex. Report what differs, and report the counts.

---

### Task 18: FormDialog, FormSheet, useLeaveGuard, createDialogState

**Files:**

- Create:
  - `src/lib/components/form/FormDialog.svelte`
  - `src/lib/components/form/FormSheet.svelte`
  - `src/lib/components/form/form-surface.svelte.ts` (shared logic for the two)
  - `src/lib/hooks/use-leave-guard.svelte.ts`
  - `src/lib/hooks/use-dialog-state.svelte.ts`
  - `tests/unit/components/form-sheet.test.ts`
  - `tests/unit/hooks/use-leave-guard.test.ts`
  - `tests/unit/hooks/use-dialog-state.test.ts`
- Modify:
  - `src/lib/components/form/index.ts` and `src/lib/hooks/index.ts` (exports)
  - `src/styles/theme/layouts.css`: `--sheet-width-md: 28rem; --sheet-width-lg: 42rem;`
- Migrate:
  - `features/permission-requests/components/CreatePermissionRequestDrawer.svelte` → FormSheet, `formId="create-permission-request-form"`
  - `features/operator/impersonation/components/ImpersonateModal.svelte` → FormDialog. The raw number input becomes NumberInput, the textarea becomes TextareaField, and `text-danger` becomes semantic.
  - Every `bind:open` + `onOpenChange` pair in the stable features (list them with `rg -n "onOpenChange=\{\(o\) =>" src/lib/features/{auth,users,roles,permission-requests,operator,tenant,audit,search} "src/routes/(app)/settings" "src/routes/(app)/operator"`) → `createDialogState`.
  - Remove the two migrated files from `phase2-rebuild-pending.json`.
- Theme reference: `DOMIEX/plugins/pixeleyezui/drawer.js` (drawer header `p-5 border-b`, footer `p-5 border-t`).

**Interfaces:**

- Consumes: `useForm(schema, initial, { open })` and `Form<S>`; the Task 4 `Sheet`/`Dialog` with `busy`; `TextareaField`; `describeError`.
- Produces (the Task 15-brief props, plus `formId`):

```ts
type FormSurfaceProps<S extends z.ZodObject<any, any>> = {
	open: boolean; // $bindable
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	submitLabel: string;
	submitVariant?: 'default' | 'destructive'; // default 'default'
	schema: S;
	initial: () => z.input<S>; // re-read on every open
	onSubmit: (values: z.output<S>) => Promise<void>; // pass mutation.mutateAsync (catalogue #12)
	fields: Snippet<[Form<S>]>;
	formId: string; // <form id>; submit button uses form={formId} (e2e selectors)
	size?: 'md' | 'lg'; // FormSheet width tokens; FormDialog max-w-lg / max-w-2xl
	guardLeave?: boolean; // default true: useLeaveGuard while open and dirty
};
// useLeaveGuard
export function useLeaveGuard(isDirty: () => boolean, message?: string): void;
// beforeNavigate: if isDirty() && !confirm(message ?? $_('form.leaveGuard')) → cancel(); beforeunload: preventDefault when dirty
// createDialogState
export interface DialogState<T> {
	readonly open: boolean;
	readonly target: T | null;
	show(target?: T): void;
	close(): void;
	onOpenChange(open: boolean): void;
}
export function createDialogState<T = never>(): DialogState<T>;
```

Behaviour (`form-surface.svelte.ts`, used by both surfaces):

1. `const form = useForm(schema, initial(), { open: () => open })`.
2. `$effect.pre(() => { if (open) untrack(() => form.reset(initial())); })` resets on every open (drift C2).
3. The `<form id={formId} onsubmit={(e) => form.submit(e, async (v, current) => { await onSubmit(v); if (current()) onOpenChange(false); })}>`.
4. The surface gets `busy={form.isSubmitting}`, so the veto covers the save.
5. The banner shows `form.bannerError` in `Alert variant="destructive"`.
6. Dirty means `JSON.stringify(form.values) !== JSON.stringify(seedAtOpen)`.
7. The footer holds Cancel, written as `<Sheet.Close>{#snippet child({ props })}<Button variant="outline" {...props}>…` with no nested button, and Submit (`type="submit" form={formId} loading={form.isSubmitting}`).

- [ ] **Step 1: Write the failing tests.**
  - `form-sheet.test.ts`. Mount FormSheet with a schema `{ name: z.string().min(1) }` and `initial: () => ({ name: seed })`.
    - (a) Open, type, close, change `seed`, reopen: the input shows the new seed and no error.
    - (b) Submit with a resolving `onSubmit`: `onOpenChange(false)` is called once.
    - (c) Submit with `onSubmit` rejecting `new ConflictError(...)`: the banner shows the `describeError` text and the sheet stays open.
    - (d) While `onSubmit` is pending, Escape does not call `onOpenChange`.
    - (e) A submit started before close and resolving after reopen does not close the reopened sheet (generation).
    - (f) The submit button has `form` equal to `formId`, and no `<button>` is inside a `<button>`.
  - `use-leave-guard.test.ts`. Mock `$app/navigation` `beforeNavigate` to capture the callback.
    - Dirty and `confirm` returns false: `cancel` is called.
    - Not dirty: `cancel` is not called.
    - A `beforeunload` event is `defaultPrevented` only when dirty.
  - `use-dialog-state.test.ts`:
    - `show(x)` sets `open` true and `target` x;
    - `onOpenChange(false)` clears both;
    - `close()` clears both.

  Run: `npx vitest run tests/unit/components/form-sheet.test.ts tests/unit/hooks/use-leave-guard.test.ts tests/unit/hooks/use-dialog-state.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement.** Add `form.leaveGuard` to en and hi.

- [ ] **Step 3: Migrate** the two components and the dialog-state pairs.

- [ ] **Step 4: Run the tests and e2e.**
  - Run: `npx vitest run tests/unit/components tests/unit/hooks`
  - Then: `npm run build && CI=1 npx playwright test tests/e2e/permission-requests.spec.ts tests/e2e/operator-impersonation.spec.ts --project=chromium --retries=0`
  - Expected: PASS.

- [ ] **Step 5: Fast checks**, then commit. Message: `feat(form): FormSheet and FormDialog (reset on open, busy veto, one banner, mutateAsync, leave guard); createDialogState; first two forms migrated`

---

### Task 19: FormSheet migrations (users, tenants)

**Files:**

- Modify:
  - `features/operator/tenants/components/CreateTenantDrawer.svelte` (`formId="register-tenant-form"`; the generated-password row uses `CopyButton`, per catalogue B)
  - `features/users/components/CreateUserDrawer.svelte`
  - `features/users/components/ManagerSelectorDrawer.svelte`
  - `features/users/components/RoleAssignmentDrawer.svelte`
  - `features/users/components/PermissionOverridesPanel.svelte` (both TagInputs get visible labels; the raw inputs at lines 110 and 140 become TextField or TagInput)
  - `phase2-rebuild-pending.json` (remove these files)
- Test: `tests/unit/components/users-list-bulk.test.ts` and `tests/unit/components/role-switch-save.test.ts` must stay green. Add `tests/unit/components/create-tenant-sheet.test.ts`, which checks that a submit calls the mutation's `mutateAsync` with the parsed values and that the sheet closes on success.

**Interfaces:**

- Consumes: Task 18 `FormSheet` and `createDialogState`; existing queries, whose mutations gain `inlineErrors: true` where they render inline.
- Produces: none new. Each drawer file shrinks to schema, `initial`, `fields` snippet and mutation.

- [ ] **Step 1: Write `create-tenant-sheet.test.ts`.**
      Run: `npx vitest run tests/unit/components/create-tenant-sheet.test.ts`
      Expected: FAIL, because the drawer is not on FormSheet yet. The assertion that fails is that the submit button is not inside the `[data-slot="sheet-footer"]`.

- [ ] **Step 2: Migrate the five files.** Replace every `new Promise(… mutate …)` with `mutateAsync`.

- [ ] **Step 3: Run the tests and e2e.**
  - Run: `npx vitest run tests/unit/components`
  - Then: `npm run build && CI=1 npx playwright test tests/e2e/operator-tenant-management.spec.ts tests/e2e/tenant-user-management.spec.ts tests/e2e/role-hierarchy.spec.ts --project=chromium --retries=0`
  - Expected: PASS.

- [ ] **Step 4: Fast checks**, then commit. Message: `refactor(users,tenants): every create/assign drawer is a FormSheet; tag inputs labelled`

---

### Task 20: ConfirmDialog on alert-dialog; ReasonConfirmDialog; six reason dialogs

**Files:**

- Create: `src/lib/components/feedback/ReasonConfirmDialog.svelte`, `tests/unit/components/reason-confirm-dialog.test.ts`, `tests/unit/components/confirm-dialog.test.ts`.
- Modify:
  - `src/lib/components/ui/alert-dialog/alert-dialog.svelte`: busy veto, a local edit (document it).
  - `src/lib/components/ui/ConfirmDialog.svelte`: move onto `AlertDialog`; add `confirmDisabled?: boolean`.
  - `src/lib/components/feedback/index.ts`.
- Migrate (each file becomes a props wrapper; its mutation gets `inlineErrors: true`):
  - `features/users/components/DeactivateUserDialog.svelte`
  - `features/roles/components/DeleteRoleDialog.svelte` (`confirmText` = role name)
  - `features/operator/tenants/components/SuspendDialog.svelte`
  - `features/operator/tenants/components/MarkForDeletionDialog.svelte` (`confirmText` = tenant slug, as shown in the list)
  - `features/operator/people/components/GlobalSuspendDialog.svelte`
  - `features/operator/people/components/AnonymiseDialog.svelte` (`confirmText` = email)
  - Remove these from the allowlist.

**Interfaces:**

- Consumes: `TextareaField`, `reasonField` (`api/request-schema.ts`), `describeError`, `ValidationError`.
- Produces:

```ts
// ReasonConfirmDialog props (the Task 15 brief; describeApiError there = describeError here)
{
	open: boolean; // $bindable
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	variant?: 'danger' | 'default'; // ConfirmDialogVariant, default 'danger'
	confirmLabel: string;
	reasonLabel?: string; // default $_('form.reason')
	reasonRequired?: boolean; // default true
	reasonMaxLength?: number; // default 500
	confirmText?: string; // type-to-confirm; button disabled until the typed text === confirmText
	noun: string;
	conflict?: string;
	onConfirm: (reason: string) => Promise<void>;
	extra?: Snippet;
}
// ConfirmDialog gains: confirmDisabled?: boolean
```

- Behaviour:
  - Reset on every open: reason, typed confirm text and the error.
  - The confirm button is disabled while `reasonRequired && reason.trim() === ''`, or while `confirmText` is set and does not match. This fixes drift C1.
  - On rejection: `ValidationError.fields.reason` goes to the field error; anything else becomes `describeError(err, { noun, verb: confirmLabel.toLowerCase(), conflict })` in the banner.
  - The dialog closes itself on success.
  - `busy` while confirming.

- [ ] **Step 1: Write the failing tests.**
  - With `confirmText="acme"`, the confirm button is disabled until "acme" is typed; it is also disabled with an empty reason.
  - `onConfirm` rejecting `new ConflictError('already suspended')` shows the conflict copy.
  - Rejecting `new ValidationError({ fields: { reason: 'Too short' } })` shows the message under the field with `role="alert"`.
  - Reopening clears everything.
  - Escape is refused while confirming.
  - ConfirmDialog with `confirmDisabled` renders a disabled action.

  Run: `npx vitest run tests/unit/components/{reason-confirm-dialog,confirm-dialog}.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement and migrate the six files.**

- [ ] **Step 3: Run the tests and e2e.**
  - Run: `npx vitest run tests/unit/components`
  - Then: `npm run build && CI=1 npx playwright test tests/e2e/operator-tenant-management.spec.ts tests/e2e/operator-people-management.spec.ts tests/e2e/tenant-user-management.spec.ts tests/e2e/tenant-roles-management.spec.ts tests/e2e/inventory.spec.ts --project=chromium --retries=0`
  - Expected: PASS. The inventory spec covers ConfirmDialog in QuarantineBatchDialog.

- [ ] **Step 4: Fast checks**, then commit. Message: `feat(feedback): ReasonConfirmDialog (type-to-confirm blocks, typed error copy); ConfirmDialog on alert-dialog; six reason dialogs migrated`

---

### Task 21: ActionForm; tenant forms and roles/new

**Files:**

- Create: `src/lib/components/form/ActionForm.svelte`, `tests/unit/components/action-form.test.ts`.
- Modify:
  - `features/tenant/components/{TenantProfileForm,TenantStatutoryForm,TenantContactForm,TenantSecurityForm,TenantDisplayPreferencesForm}.svelte`
  - `routes/(app)/settings/roles/new/+page.svelte`
- Delete: `features/tenant/components/TenantSaveFooter.svelte`. It is absorbed into ActionForm (D7). Re-export nothing.
- Theme reference: `DOMIEX/src/routes/(main-layout)/pages-account-settings/AccountSetting.svelte` (card with a 3/9 split: section title on the left, fields on the right; footer actions on the end side).

**Interfaces:**

- Consumes:
  - `failForm`'s shape (`src/lib/server/form-action.ts`): `{ values, fieldKeys: Record<string,string>, fieldMessages: Record<string,string>, formErrorKey: string | null }`, plus `success?: true` on the action's success return. Read the five tenant actions for the success key.
  - `ScopeContextField`, `useLeaveGuard`, `$_`.
- Produces:

```ts
// ActionForm props
export type ActionFormResult = {
	values?: Record<string, unknown>;
	fieldKeys?: Record<string, string>;
	fieldMessages?: Record<string, string>;
	formErrorKey?: string | null;
	success?: boolean;
};
{
	id: string;
	action?: string; // e.g. '?/save'
	result: ActionFormResult | null | undefined; // the page's `form` prop
	submitLabel: string;
	successMessage: string;
	allowed?: boolean; // default true; false → footer shows `disallowedReason` instead of the button
	disallowedReason?: string;
	scoped?: boolean; // default true → renders <ScopeContextField/>
	isDirty?: () => boolean; // → useLeaveGuard
	onResult?: (r: import('@sveltejs/kit').ActionResult) => void; // escape hatch (signin lockout)
	children: Snippet<[{ submitting: boolean; fieldError: (name: string) => string | undefined; value: (name: string) => unknown }]>;
}
```

- Behaviour:
  - It renders `<form method="POST" {action} {id} use:enhance>`.
  - While submitting it sets `submitting`, then `update({ reset: false })`, then calls `onResult`.
  - `fieldError(n)` is `fieldMessages[n] ?? (fieldKeys[n] && $_(fieldKeys[n]))`.
  - The outcome is `Alert variant="destructive"` with `$_(formErrorKey)`, or `Alert variant="success"` with `successMessage`.
  - The footer is `<div class="form-footer">` with `Button type="submit" loading={submitting}`, so the `check-form-submit-canon` gate stays satisfied.

- [ ] **Step 1: Write the failing test.** Mock `$app/forms` `enhance` (the existing stub) and render ActionForm with `result = { formErrorKey: 'auth.errors.upstreamUnavailable', fieldKeys: { name: 'tenant.errors.nameRequired' } }`. Assert:
  - the destructive alert shows the translated text;
  - `fieldError('name')` passes the translated text to the snippet;
  - with `allowed=false` there is no submit button and the reason is shown;
  - `result = { success: true }` shows the success alert with `role="status"`.

  Run: `npx vitest run tests/unit/components/action-form.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement and migrate the six files.** Each tenant form passes `isDirty` (compare the current values to the loaded DTO) and `allowed={session.can(TENANT_SECTION_PERMISSION[section])}`.

- [ ] **Step 3: Run the tests and e2e.**
  - Run: `npx vitest run tests/unit/components tests/unit/server/tenant-settings-actions.test.ts tests/unit/server/roles-create-action.test.ts`
  - Then: `npm run build && CI=1 npx playwright test tests/e2e/tenant-settings.spec.ts tests/e2e/tenant-roles-management.spec.ts --project=chromium --retries=0`
  - Expected: PASS.

- [ ] **Step 4: Fast checks**, then commit. Message: `feat(form): ActionForm (enhance, one outcome alert, permission-aware footer, leave guard); tenant settings and new-role forms on it`

---

### Task 22: ActionForm for auth + must-change-password; Domiex sign-in card

**Files:**

- Modify:
  - `features/auth/components/{SigninForm,ForgotPasswordForm,ResetPasswordForm,ProfileForm,ChangePasswordForm,ChangeEmailForm,ConfirmEmailChangeView}.svelte`
  - `routes/(app)/must-change-password/+page.svelte`
  - `src/lib/components/ui/AuthCard.svelte`: the Domiex basic card.
- Test: extend `tests/unit/server/{auth-actions,password-actions}.test.ts` only if the action contracts change; they must not. Add `tests/unit/components/signin-form.test.ts`: the lockout countdown still renders from `onResult` and the submit button is disabled during the countdown.
- Theme reference: `DOMIEX/src/routes/auth-signin-basic/BasicSignIn.svelte`. Card `md:p-10`, logo `h-8`, title, `gap-5` grid, full-width primary button. Omit the gradient title (it needs a non-token pink) and the social buttons (no backend) — a plan decision.

**Interfaces:**

- Consumes: Task 21 `ActionForm` (with `scoped={false}` on pre-login forms).
- Produces: none new.

- [ ] **Step 1: Write the failing `signin-form.test.ts`.**
      Run: `npx vitest run tests/unit/components/signin-form.test.ts`
      Expected: FAIL.

- [ ] **Step 2: Migrate the eight files and restyle AuthCard.**

- [ ] **Step 3: Run the tests and e2e.**
  - Run: `npx vitest run tests/unit/components tests/unit/server/auth-actions.test.ts tests/unit/server/password-actions.test.ts`
  - Then: `npm run build && CI=1 npx playwright test tests/e2e/forgot-password.spec.ts tests/e2e/auth-must-change-and-lockout.spec.ts tests/e2e/email-change.spec.ts tests/e2e/account-self-service.spec.ts tests/e2e/session-refresh.spec.ts --project=chromium --retries=0`
  - Expected: PASS.

- [ ] **Step 4: Fast checks**, then commit. Message: `refactor(auth): every auth and account form is an ActionForm; Domiex basic sign-in card`

---

### Task 23: DataTable core

**Files:**

- Create:
  - `src/lib/components/data/data-table/types.ts`
  - `src/lib/components/data/data-table/columns.ts` (conversion to TanStack)
  - `src/lib/components/data/data-table/DataTable.svelte`
  - `src/lib/components/data/data-table/DataTableHeader.svelte`
  - `src/lib/components/data/data-table/DataTableBody.svelte`
  - `src/lib/components/data/data-table/DataTableColumnsMenu.svelte`
  - `src/lib/components/data/data-table/index.ts`
  - `tests/unit/components/data-table.test.ts`
- Modify: `src/lib/components/data/index.ts` (export `DataTable` and its types); `package.json` (`npm install @tanstack/svelte-table@^9`).
- Theme reference:
  - `DOMIEX/plugins/pixeleyezui/table.js`
  - `DOMIEX/src/routes/(main-layout)/table-datatables-basic/BasicDatatable.svelte`: header row `bg-muted text-muted-foreground`, cells `px-3 py-3.5`, `border-b`, hovered rows `hover:bg-muted/50`. Toolbar and footer: "Showing x–y of n" plus the pager.
  - `DOMIEX/src/routes/(main-layout)/apps-ecommerce-orders-list/Order.svelte` (a realistic list inside a card).

**Interfaces:**

- Consumes: regenerated `ui/table` and `ui/checkbox`; `QueryState` and its `QueryLike` type; `BulkSelection<T>`; `DropdownMenu`.
- Produces:

```ts
// types.ts
import type { Snippet } from 'svelte';
import type { BulkSelection, InfiniteList, KeyboardListNav } from '#lib/hooks/index.ts';
export type Density = 'compact' | 'default';
export type SortState = { id: string; desc: boolean } | null;
export interface DataTableColumn<T> {
	id: string;
	header: string;
	accessor?: (row: T) => string | number | null | undefined;
	cell?: Snippet<[T]>;
	sortable?: boolean; // client: sorts by sortValue ?? accessor; server: emits onChange
	sortValue?: (row: T) => string | number;
	hideable?: boolean; // appears in the Columns menu (default true unless primary)
	defaultHidden?: boolean;
	primary?: boolean; // the cell rowHref links from (default: first column)
	align?: 'start' | 'end';
	class?: string; // width/alignment utilities only
}
export type DataTableSorting =
	| { mode: 'none' }
	| { mode: 'client'; initial?: SortState }
	| { mode: 'server'; state: SortState; onChange: (next: SortState) => void };
export type DataTablePagination<T> =
	| { mode: 'none' }
	| { mode: 'client'; pageSize: number }
	| { mode: 'offset'; page: number; pageCount: number; onPageChange: (page: number) => void }
	| { mode: 'cursor'; list: InfiniteList<T> };
export interface DataTableProps<T> {
	columns: DataTableColumn<T>[];
	data: T[];
	getRowId: (row: T) => string;
	noun: string; // QueryState copy: "Loading users", "No users"
	query?: { isPending: boolean; isError: boolean; error: unknown; refetch?: () => unknown }; // omit for static data
	selection?: {
		mode: 'single' | 'multi';
		state: BulkSelection<T & { id: string }>;
		rowLabel: (row: T) => string;
	};
	sorting?: DataTableSorting; // default { mode: 'none' }
	pagination?: DataTablePagination<T>; // default { mode: 'none' }
	columnVisibility?: boolean; // default false: shows the "Columns" menu
	rowHref?: (row: T) => string;
	rowActions?: Snippet<[T]>; // last column, sr-only header $_('dataTable.actions')
	footer?: Snippet; // <tfoot> (totals)
	empty?: Snippet;
	stickyHeader?: boolean; // default true
	density?: Density; // default 'default'
	virtualizeAbove?: number; // default 100 (Task 24)
	nav?: KeyboardListNav<T & { id: string }>; // Task 24
	caption?: string; // sr-only <caption>
}
```

- Behaviour:
  - `columns.ts` maps `DataTableColumn<T>` to TanStack v9 column defs. Use `createTable` from `@tanstack/svelte-table` with v9's feature registration:
    - `_features: tableFeatures({ rowSortingFeature, rowSelectionFeature, columnVisibilityFeature, rowPaginationFeature })`
    - `_rowModels: { sortedRowModel: createSortedRowModel(sortFns), paginatedRowModel: createPaginatedRowModel() }`

    Confirm the exact export names in `node_modules/@tanstack/svelte-table`'s type definitions before writing (v9 renamed v8 APIs). Pages never see these names. Server sorting sets `manualSorting: true`.

  - Sortable headers render `<button>` inside `<th aria-sort="ascending|descending|none">`. The cycle is none → asc → desc → none.
  - Selection:
    - A checkbox column has `aria-label={rowLabel(row)}`, and the header checkbox "Select all" acts on all **loaded** rows (`data`, not the page or rendered window).
    - A `single` selection clears before toggling.
    - State lives in `selection.state`, keyed by `getRowId`, so it survives sorting, pagination and virtualisation.
  - `rowHref` renders the primary cell as `<a href>`. The `<tr>` is never clickable.
  - `stickyHeader` sets `thead` to `sticky top-0 z-(--z-sticky) bg-card`, inside a scroll container `overflow-auto max-h-(--data-table-max-height)`, with `--data-table-max-height: 70vh` in `layouts.css`.
  - Loading, error and empty: the whole table is wrapped in `<QueryState query noun isEmpty={() => data.length === 0} skeleton={tableSkeleton} empty={empty}>`. The skeleton is a header plus 5 rows of `Skeleton`.
  - `density="compact"` uses `py-2` cells; the default uses `py-3.5` (Domiex).
  - The Columns menu is a `DropdownMenu` of `CheckboxItem`s for the hideable columns.

- [ ] **Step 1: Write the failing tests** (`data-table.test.ts`, mounting with `createRawSnippet` cells):
  - (a) It renders the headers and one `tr` per row.
  - (b) With `sorting.mode='client'`, clicking the "Name" header sorts ascending and sets `aria-sort="ascending"`; clicking again sorts descending.
  - (c) With `sorting.mode='server'`, clicking calls `onChange({ id: 'name', desc: false })` and does not reorder.
  - (d) Multi selection: the header checkbox selects every row in `data`; after re-sorting, the same ids are still selected.
  - (e) `rowHref` puts an `<a href>` in the primary cell and no `onclick` on `tr`.
  - (f) The Columns menu hides a column.
  - (g) `query.isPending` renders `[aria-busy="true"]` with the header visible in the skeleton.
  - (h) `query.isError` with `NotFoundError` renders QueryState's not-found copy.
  - (i) The actions column header is sr-only text `Actions`.
  - (j) `pagination.mode='client', pageSize: 10` with 25 rows shows 10 rows and the pager; "Next" shows rows 11–20.
  - (k) `pagination.mode='offset'` calls `onPageChange(2)`.

  Run: `npx vitest run tests/unit/components/data-table.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement.** Add `dataTable.*` i18n keys (en and hi): `actions`, `selectAll`, `columns`, `showing` with ICU `{from}–{to} of {total}`, `sortAscending`, `sortDescending`.

- [ ] **Step 3: Run the tests.**
      Run: `npx vitest run tests/unit/components/data-table.test.ts`
      Expected: PASS.

- [ ] **Step 4: Fast checks**, then commit. Message: `feat(data): DataTable on TanStack Table v9 — client/server sorting with aria-sort, selection by row id, column visibility, primary-cell links, sticky header, QueryState states, client/offset paging`

---

### Task 24: DataTable — virtualisation, keyboard, cursor paging, perf bench

**Files:**

- Modify: `src/lib/components/data/data-table/{DataTable,DataTableBody}.svelte`; `package.json` (`npm install virtua`).
- Create:
  - `src/routes/(dev)/data-table-bench/+page.svelte`
  - `src/routes/(dev)/data-table-bench/+page.server.ts` (`if (!dev && process.env.NODE_ENV !== 'test') error(404)`; returns nothing; rows are generated client-side with a fixed seed)
  - `tests/unit/components/data-table-virtual.test.ts`
  - `tests/e2e/data-table.spec.ts`

**Interfaces:**

- Consumes: `Virtualizer` from `virtua/svelte`; `createKeyboardListNav`; `InfiniteList<T>` and `InfiniteListFooter`.
- Produces: no new props. The Task 23 props are `virtualizeAbove`, `nav` and `pagination.mode='cursor'`.
- Behaviour:
  - When `rows.length > virtualizeAbove`, `DataTableBody` renders `<Virtualizer data={rows} getKey={(r) => r.id} scrollRef={scrollEl} startMargin={theadHeight} as="tbody" item="tr">`. If the installed virtua's Svelte `Virtualizer` lacks `as`/`item`, check its type definitions: use `VList`-free spacer rows instead. Render `<tr aria-hidden="true" style="height:{before}px">` before and after the visible window, from `Virtualizer`'s range callback. Never change the public props.
  - `aria-rowcount={rows.length}` goes on `<table>`; `aria-rowindex` goes on each rendered `<tr>`.
  - Keyboard: when `nav` is passed, the body gets `data-roving-root`, and each row registers via `nav.registerRef(id, el)` and uses `tabindex={nav.tabindexFor(i)}`. On a virtualised table, `focusRow(i)` first scrolls the virtualiser to `i`: call `scrollToIndex(i)` on the `Virtualizer`, then focus on the next frame. Focus is tracked by row id, so recycling never moves it.
  - Cursor paging: `data` comes from `list.items`, `query` from `list.query`, and `<InfiniteListFooter {list}/>` renders below the scroll container. Its sentinel sits inside the scroll container's end.

- [ ] **Step 1: Write the failing unit test.** Mount 1,000 rows in a jsdom-sized container. Mock `ResizeObserver` and give the scroll element a fixed `clientHeight`. Assert:
  - fewer than 100 `tbody tr` are rendered;
  - `aria-rowcount="1000"`;
  - after selecting row id `r-5`, scrolling to the end and back, row `r-5` is still checked;
  - "Select all" selects 1,000 ids.

  Run: `npx vitest run tests/unit/components/data-table-virtual.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement** virtualisation, keyboard and cursor paging, and the bench page. The bench page renders 1,000 seeded rows with 8 columns, client sorting, multi selection and `rowHref`.

- [ ] **Step 3: Write the e2e** `tests/e2e/data-table.spec.ts` on `/data-table-bench`:
  - (a) Scrolling to the bottom shows the last row's id.
  - (b) Sorting by "Name" completes (the first row text changes) in under 100 ms. Measure with `performance.now()` inside `page.evaluate` around the click until a `MutationObserver` sees the change. This is informational: `test.info().annotations.push({ type: 'perf', description: '<ms>' })`, failing only above 500 ms.
  - (c) Clicking a row checkbox until its `aria-checked` updates takes under 100 ms, also as an annotation.
  - (d) ArrowDown from a focused row moves focus to the next row, including across the virtual window edge.
  - (e) Record a Playwright trace (`context.tracing.start({ screenshots: false, snapshots: false })`) for the scroll and attach it. This is informational, per spec §5.6.

  Run: `npm run build && CI=1 npx playwright test tests/e2e/data-table.spec.ts --project=chromium --retries=0`
  Expected: PASS.

- [ ] **Step 4: Fast checks**, then commit. Message: `feat(data): DataTable virtualises above 100 rows (virtua), keeps selection and focus by row id, keyboard row navigation, cursor paging via InfiniteList; 1,000-row bench with perf annotations`

---

### Task 25: IdentityCell, IdChip, BackLink, RowActionsMenu

**Files:**

- Create:
  - `src/lib/components/data/IdentityCell.svelte`
  - `src/lib/components/data/IdChip.svelte`
  - `src/lib/components/data/BackLink.svelte`
  - `src/lib/components/data/RowActionsMenu.svelte`
  - `tests/unit/components/identity-pieces.test.ts`
- Migrate (stable occurrences only):
  - IdentityCell:
    - `operator/people/components/{PeopleList,PersonDetail}.svelte`
    - `users/components/{OrgTreeNode,UserDetailTabs,UsersList}.svelte`
    - `routes/(app)/settings/users/[id]/+page.svelte`
  - IdChip:
    - `PersonDetail`
    - `permission-requests/components/PermissionRequestDetail.svelte`
    - `routes/(app)/operator/scope/profile/+page.svelte`
    - `routes/(app)/settings/roles/[id]/+page.svelte`
  - BackLink: `PermissionRequestDetail`.
  - RowActionsMenu:
    - `operator/tenants/components/TenantsList.svelte`
    - `roles/components/RolesList.svelte` (fixes the `<a>` inside `Dropdown.Item`)
    - `users/components/UsersList.svelte`
    - `routes/(app)/settings/users/[id]/+page.svelte`
  - Update `tests/e2e/tenant-roles-management.spec.ts` (`tr:has-text("Sales Lead") button[aria-label="Row actions"]` → `getByRole('button', { name: 'Actions for Sales Lead' })`) and any spec using the generic label.

**Interfaces:**

- Consumes: `Avatar`, `initials` and `displayName` (`#lib/utils/person-name.ts`), `CopyButton`, `DropdownMenu`, `Button`.
- Produces:

```ts
// IdentityCell
{ name: string; subtitle?: string; href?: string; size?: 'sm' | 'md'; avatarUrl?: string | null }
// IdChip
{ value: string; label: string } // <code class="font-mono text-xs">{short(value)}</code> + CopyButton(aria-label "Copy {label}")
// BackLink
{ href: string; label: string } // <a> with ArrowLeft icon, text-muted-foreground hover:text-foreground
// RowActionsMenu
type RowAction = { id: string; label: string; icon?: LucideIcon; variant?: 'default' | 'destructive';
	onSelect?: () => void; href?: string; disabled?: boolean };
{ label: string; actions: RowAction[] } // trigger aria-label = $_('dataTable.rowActions', { values: { row: label } }) → "Actions for {row}"
// href actions render DropdownMenu.Item with the child snippet → <a {...props} href>; no <a> nested in an item
```

- [ ] **Step 1: Write the failing tests.**
  - IdentityCell: it shows the initials when there is no avatar, and with `href` the name is a link.
  - IdChip: the copy button's accessible name includes the label.
  - RowActionsMenu:
    - the trigger's name is "Actions for Sales Lead";
    - an `href` action is an `<a>` with role `menuitem` and no nested interactive element;
    - a disabled action has `aria-disabled`.

  Run: `npx vitest run tests/unit/components/identity-pieces.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement the pieces and migrate.**

- [ ] **Step 3: Run the tests and e2e.**
  - Run: `npx vitest run tests/unit/components`
  - Then: `npm run build && CI=1 npx playwright test tests/e2e/tenant-roles-management.spec.ts tests/e2e/tenant-user-management.spec.ts tests/e2e/operator-people-management.spec.ts tests/e2e/role-hierarchy.spec.ts tests/e2e/permission-requests.spec.ts --project=chromium --retries=0`
  - Expected: PASS.

- [ ] **Step 4: Fast checks**, then commit. Message: `feat(data): IdentityCell, IdChip, BackLink and RowActionsMenu (per-row accessible names, no nested interactives); identity screens migrated`

---

### Task 26: List pattern; Tenants and People lists; PersonDetail

**Files:**

- Create:
  - `src/lib/components/data/SearchInput.svelte`
  - `src/lib/components/data/StatusChips.svelte`
  - `tests/unit/components/search-input.test.ts`
  - `tests/unit/components/status-chips.test.ts`
  - `tests/unit/components/resource-list-page.test.ts`
- Modify:
  - `src/lib/components/data/ResourceListPage.svelte`: header through PageHeader; search, chips and table slots; it embeds the DataTable via the `children` snippet unchanged.
  - `src/lib/components/data/FilterBar.svelte`: shadcn `Select`, multi-select as `Popover` + `Command` with checkbox items, dates as `DatePicker`/`DateRangePicker`. Same `FilterBarField` type and props.
  - `src/lib/components/data/{Toolbar,FilterChips,BulkActionBar}.svelte`: tokens and regenerated primitives; same props.
  - `features/operator/tenants/components/TenantsList.svelte`: ResourceListPage + DataTable (offset paging via the `Pagination` composite as today) + SearchInput + StatusChips (tenant status from `defineStatusMap`) + `createUrlFilters`.
  - `features/operator/people/components/PeopleList.svelte`: the same; query created once (`personsListQuery(() => params)`).
  - `features/operator/people/components/PersonDetail.svelte`:
    - the raw memberships `<table>` → DataTable
    - queries created once: `personDetailQuery(() => personId)`, `personMembershipsQuery(() => personId)`, `personActivityQuery(() => personId)`
  - `features/operator/people/queries.ts` and `features/audit/queries.ts`: the factories accept `() => string` getters (`createQuery(() => ({ queryKey: keys.detail(id()), … }))`). Update every caller, including `routes/(app)/operator/persons/[id]/+page.svelte` and `routes/(app)/operator/scope/activity/+page.svelte`, and remove their `$derived(...Query(...))`.
  - `phase2-rebuild-pending.json`: remove TenantsList, PeopleList and PersonDetail.
- Theme reference:
  - `DOMIEX/src/routes/(main-layout)/apps-ecommerce-orders-list/Order.svelte` (filter row above the table, status tabs, search on the end side)
  - `DOMIEX/src/routes/(main-layout)/table-datatables-basic/BasicDatatable.svelte` (search box, footer count)

**Interfaces:**

- Consumes: `UrlFilters<T>` / `createUrlFilters` (with `setMany`), DataTable, PageHeader, `defineStatusMap` views.
- Produces:

```ts
// SearchInput
{ value: string; onSearch: (q: string) => void; label: string; placeholder?: string; debounceMs?: number /* 300 */ }
// trims; fires once per pause; Enter fires immediately; Escape clears; <input type="search" aria-label={label}>
// StatusChips
{ label: string; options: Array<{ value: string; label: string; count?: number }>; value: string | null;
  onChange: (value: string | null) => void } // ToggleGroup single; "All" = null
// ResourceListPage gains: search?: { value: string; onSearch(q: string): void; label: string }; chips?: Snippet;
// title/subtitle/primaryAction now flow into <PageHeader>; existing props unchanged
```

- [ ] **Step 1: Write the failing tests.**
  - search-input (fake timers):
    - typing " ac " fires once with "ac" after 300 ms;
    - Enter fires immediately;
    - Escape clears and fires "".
  - status-chips: clicking "Suspended" calls `onChange('suspended')`; "All" calls `onChange(null)`; the group has an accessible name.
  - resource-list-page: the title renders as the single `h1`, and the search's `aria-label` is present.

  Run: `npx vitest run tests/unit/components/{search-input,status-chips,resource-list-page}.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Implement the pieces and FilterBar.** Then migrate TenantsList, PeopleList and PersonDetail, and change the query factories.

- [ ] **Step 3: Run the tests and e2e.**
  - Run: `npx vitest run tests/unit/components tests/unit/features tests/unit/hooks`
  - Then: `npm run build && CI=1 npx playwright test tests/e2e/operator-tenant-management.spec.ts tests/e2e/operator-people-management.spec.ts tests/e2e/inventory.spec.ts tests/e2e/orders.spec.ts tests/e2e/leads.spec.ts --project=chromium --retries=0`
  - Expected: PASS. Inventory, orders and leads use FilterBar and ResourceListPage.
  - `leads.spec.ts:224` (`stageSelect.selectOption(['interested'])` on `#filterbar-stage`) changes in this commit to: open the "Stage" filter button, then `getByRole('option', { name: 'Interested' }).click()`.

- [ ] **Step 4: Fast checks**, then commit. Message: `feat(data): list pattern — SearchInput (debounced, labelled), StatusChips, FilterBar on shadcn primitives; tenants and people lists on DataTable; person queries created once`

---

### Task 27: Users, Roles, Permission-request lists; PermissionTree; UserDetailTabs; users/[id]

**Files:**

- Modify:
  - `features/users/components/UsersList.svelte`: ResourceListPage + DataTable (selection via the existing `createBulkSelection` and `BulkActionBar`) + SearchInput (adds the missing `aria-label`) + StatusChips.
  - `features/roles/components/RolesList.svelte`: DataTable + RowActionsMenu (already) + `Pagination` → DataTable `offset` mode.
  - `features/permission-requests/components/PermissionRequestsList.svelte`: DataTable `cursor` mode with its `InfiniteList`, and `useUrlTab` for its tabs (catalogue B).
  - `features/roles/components/PermissionTree.svelte` (L32): `<fieldset>` + `<legend>` per group, regenerated `Checkbox`, and the group "select all" as a tri-state checkbox with `aria-checked="mixed"`.
  - `features/users/components/UserDetailTabs.svelte`: `personActivityQuery(() => user.person_id)` created once; tabs via `useUrlTab`.
  - `routes/(app)/settings/users/[id]/+page.svelte`, `routes/(app)/settings/users/hierarchy/+page.svelte`, `routes/(app)/operator/scope/{members,roles}/+page.svelte`: PageHeader and the migrated lists.
  - `routes/(app)/settings/roles/[id]/+page.svelte`: the raw number input at line 218 → `NumberInput`, PageHeader, IdChip (Task 25). The role editor's logic is Phase 3 and is not changed here.
  - `phase2-rebuild-pending.json`: remove these files. After this task no stable file may remain in any list.
- Test: `tests/unit/components/permission-tree.test.ts` (new); `users-list-bulk.test.ts` and `write-button-gating.test.ts` stay green.

**Interfaces:**

- Consumes: everything from Tasks 23–26.
- Produces: none new.

- [ ] **Step 1: Write the failing `permission-tree.test.ts`.**
  - each group is a `group` role (fieldset) named by its legend;
  - checking one of two children makes the group checkbox `aria-checked="mixed"`;
  - checking the group checks all its children;
  - there is no `role="tree"`.

  Run: `npx vitest run tests/unit/components/permission-tree.test.ts`
  Expected: FAIL.

- [ ] **Step 2: Migrate the files.**

- [ ] **Step 3: Run the tests, gates and e2e.**
  - Run: `npx vitest run tests/unit/components && node scripts/arch/check-raw-elements.mjs && node scripts/arch/check-legacy-imports.mjs`
  - Then: `npm run build && CI=1 npx playwright test tests/e2e/tenant-user-management.spec.ts tests/e2e/tenant-roles-management.spec.ts tests/e2e/role-hierarchy.spec.ts tests/e2e/permission-requests.spec.ts tests/e2e/operator-tenant-management.spec.ts --project=chromium --retries=0`
  - Expected: PASS.

- [ ] **Step 4: Fast checks**, then commit. Message: `refactor(identity): users, roles and permission-request lists on DataTable; permission tree as labelled checkbox groups; detail queries created once`

---

### Task 28: Dashboards on StatCard; settings/account pages

**Files:**

- Modify:
  - `features/dashboard/components/{PlatformDashboard,TenantAdminDashboard,TenantUserDashboard}.svelte`: `StatCard` for every tile; delete the copied `.lk-dash-tile-icon` style ×3; `Badge` instead of hand-rolled pills; PageHeader (Task 14). Keep the "Skeleton — v0.4" alert until Phase 3 wires data.
  - `src/lib/components/ui/StatCard.svelte`: Domiex card, tokens.
  - `features/audit/components/ActivityTimeline.svelte`: `QueryState` instead of its own Alert/Skeleton ladder; `ui/timeline`; `relativeTime` from `utils/format.ts` instead of its own copy.
  - `features/auth/components/SessionsList.svelte`: DataTable (`rowActions` revoke).
  - `routes/(app)/settings/account/{+layout,profile,security,sessions,activity}`: PageHeader and SectionNav (Task 14) and consistent cards.
- Theme reference: `DOMIEX/plugins/pixeleyezui/cards.js`; the dashboard widget cards in `DOMIEX/src/routes/(main-layout)/` (any `dashboards-*` route: icon chip, value `text-2xl font-semibold`, label `text-muted-foreground`).
- Test: `tests/unit/components/stat-card.test.ts`: `loading` shows a skeleton with `aria-busy`; `delta` renders the sign and the accent; the value is announced together with its label (`<dl>` semantics).

**Interfaces:**

- Consumes: StatCard (existing props: `label`, `value`, `delta?`, `icon?`, `loading?`, `accent?`, `class?`), QueryState, DataTable, Timeline.
- Produces: none new.

- [ ] **Step 1: Write the failing `stat-card.test.ts`** (the `<dl>` assertion fails today).
      Run: `npx vitest run tests/unit/components/stat-card.test.ts`
      Expected: FAIL.

- [ ] **Step 2: Implement** the StatCard semantics and migrate the files.

- [ ] **Step 3: Run the tests and e2e.**
  - Run: `npx vitest run tests/unit/components`
  - Then: `npm run build && CI=1 npx playwright test tests/e2e/account-self-service.spec.ts tests/e2e/role-aware-shell.spec.ts tests/e2e/a11y.spec.ts --project=chromium --retries=0`
  - Expected: PASS.

- [ ] **Step 4: Fast checks**, then commit. Message: `refactor(dashboard,account): dashboards on StatCard; activity timeline on QueryState; sessions on DataTable`

---

### Task 29: CHECKPOINT 3 — patterns and migrations

- [ ] **Step 1: Run the full gates** (Task 8 Step 1), plus `npm run size`.

- [ ] **Step 2: Run the full chromium and a11y suites** (light and dark).

- [ ] **Step 3: Assert the allowlist is clean.** `phase2-rebuild-pending.json` may list only paths under `features/{leads,orders,inventory}`, `routes/(app)/{leads,orders,inventory}`, `components/data/BulkUploadDrawer.svelte` (leads and inventory use it) and the legacy `ui/data-table` consumers. Add this assertion to `check-raw-elements.mjs` itself, so it holds from now on.

- [ ] **Step 4: Fix regressions and commit each fix separately.** Report the counts and the list of section-9 items still open.

---

### Task 30: Test infrastructure — visual, a11y, stale comments

**Files:**

- Modify:
  - `tests/visual/fixtures/stability.ts`: CSP-safe freeze (L30).
  - `playwright.config.ts`:
    - `snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}'`
    - visual project `use.colorScheme: 'light'`
  - `tests/visual/routes/*.visual.spec.ts`: the pairwise matrix.
  - Create `tests/visual/routes/{nav,customizer}.visual.spec.ts`.
  - `tests/a11y/routes.spec.ts`: light and dark from Task 17, kept.
  - `tests/e2e/helpers/test.ts:45-53` and `tests/e2e/hover-preload.spec.ts:6`: correct the comments to "app.html preloads data on tap and code on hover; tests switch preloading off".
  - `.github/workflows/visual-refresh.yml`: confirm it regenerates the `linux` folder only; no behaviour change otherwise.
- Create: `tests/visual/fixtures/freeze.css.ts` (the freeze CSS as an exported string) and `tests/visual/__screenshots__/win32/**` (generated).

**Interfaces:**

- Produces:

```ts
// stability.ts
export async function freezeAnimations(page: Page): Promise<void>;
// page.evaluate((css) => { const s = new CSSStyleSheet(); s.replaceSync(css); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; }, FREEZE_CSS)
export async function stabilise(page: Page): Promise<void>; // fonts → freeze; unchanged signature
export const SNAPSHOT_OPTIONS: { animations: 'disabled'; caret: 'hide'; maxDiffPixelRatio: number };
export async function setPreferencesCookie(page: Page, prefs: Partial<Preferences>): Promise<void>; // encodePreferences + addCookies
```

- [ ] **Step 1: Write a failing probe test** in `tests/visual/routes/errors.visual.spec.ts`. After `stabilise(page)` on `/signin`, `getComputedStyle(document.querySelector('input')).caretColor` is `"rgba(0, 0, 0, 0)"`, and no `securitypolicyviolation` event fired. Listen with `page.evaluate(() => addEventListener('securitypolicyviolation', …))` before stabilise.
      Run: `npm run build && CI=1 npx playwright test --project=visual tests/visual/routes/errors.visual.spec.ts --retries=0`
      Expected: FAIL (the style tag is blocked).

- [ ] **Step 2: Implement `freezeAnimations` with `adoptedStyleSheets`.** Re-run. If a violation still fires, set `bypassCSP: true` in the visual project's `use` only, and state why in the comment (L30).

- [ ] **Step 3: Build the matrix**, pairwise per spec §8:
  - Every route already covered by `tests/visual/routes/*` in light and dark (set the `mode` cookie).
  - On the 3 anchors (`/dashboard`, `/settings/users`, `/settings/users/[id]`, L29), one shot per non-default value of each axis:
    - layout ×4
    - navType ×3
    - contentWidth ×1
    - sidebar ×2
    - mode ×2 (`auto` emulating dark, plus `black-white`)
    - colors ×7
    - sidebarColors ×4
    - darkPalette ×4 (with `mode=dark`)
  - Keep it to `/dashboard` for colors, sidebarColors and darkPalette, and use all 3 anchors for the structural axes. That totals about 30 + 2×routes.
  - `nav.visual.spec.ts`: sidebar large/medium/small, horizontal nav with a section open, the mobile sheet open at 390px, and the tenant-context banner. This closes "nav not screenshot-checked".
  - `customizer.visual.spec.ts`: the customizer open in light and dark.

- [ ] **Step 4: Generate the local baselines.**
      Run: `npm run build && CI=1 npx playwright test --project=visual --update-snapshots`, then the same without `--update-snapshots`.
      Expected: PASS twice in a row (determinism check). Commit the `win32` baselines.

- [ ] **Step 5: Run the a11y suite.**
      Run: `CI=1 npx playwright test --project=a11y --retries=0`
      Expected: PASS, light and dark, with the customizer open.

- [ ] **Step 6: Commit.** Message: `test(visual): CSP-safe stabiliser, platform-keyed baselines, pairwise preference matrix, nav and customizer shots; a11y in light and dark`. Report to the controller that Linux baselines need the owner to run `visual-refresh.yml` once the branch is pushed.

---

### Task 31: CLAUDE.md and doctrine docs

**Files:**

- Modify:
  - `CLAUDE.md`. The owner reviews this commit.
  - `docs/superpowers/specs/2026-11-18-reuse-catalogue.md`: append a "Status after Phase 2" table, catalogue # → closed / carried (section 9).

**Interfaces:** none.

- [ ] **Step 1: Rewrite the stale sections of CLAUDE.md**, keeping the rest verbatim:
  - **Component library doctrine.** Replace it with spec §3 plus this plan's changes:
    - bits-ui + shadcn-svelte (CLI, `ui/CUSTOMIZATIONS.md`)
    - @tanstack/svelte-table + virtua
    - svelte-sonner
    - @lucide/svelte via `$icons`
    - cva + `cn`
    - tw-animate-css
    - no GlassSurface, Svelte Bits, vaul or tailwind-variants
    - forms: `useForm` + `FormSheet`/`FormDialog` for mutations, `ActionForm` (Kit `enhance` + `failForm`) for server actions (L14)
  - **Hard rule 2.** adapter-node, SSR allowed; remove "SSR — adapter-static only" from Banned.
  - **Hard rule 7.** Tokens: section 4 of this plan, the shadcn semantic names, `light-dark()`, and "palette ramps only in `styles/theme/`".
  - **Hard rule 4.** Remove "class-based hooks" from the "Where to find things" table.
  - **The aliases** (`#lib/...`).
  - **Backend integration.** Cookie auth, no Vite proxy, no localStorage tokens; the FOUC script is gone and preferences arrive by cookie at SSR.
  - **Rule of Three.** Replace it with D7 for UI, keeping Rule of Three only for non-UI utilities.
  - **Design implementation discipline**, rules 5 and 6:
    - text hierarchy is `text-foreground` / `text-muted-foreground` (two levels);
    - typography is the system stack unless the owner approves Inter (L13).
  - **CI gates.** Add `check-bits-ui-boundary`, `check-banned-packages`, `check-raw-elements`, `check-legacy-imports` and the extended `check-tokens` and `check-token-contrast`.
  - **Page rebuilds.** Add the pointer: "Page rebuilds must follow the Phase 2 contract in `docs/superpowers/plans/2026-11-20-phase-2-ui-foundation.md` §9."

- [ ] **Step 2: Run `npx prettier --check CLAUDE.md docs/`.** Then commit. Message: `docs: CLAUDE.md matches the Phase 2 foundation (stack, tokens, forms, gates, reuse rule)`

---

### Task 32: CHECKPOINT 4 — final

- [ ] **Step 1: Run every gate.** `npm run verify && npm run test:coverage && npm run build && npm run storybook:build && npm run size && npm audit --audit-level=high`.

- [ ] **Step 2: Run every browser project.** `CI=1 npx playwright test --project=chromium --project=firefox --project=webkit --retries=0`, then `--project=a11y`, then `--project=visual`.

- [ ] **Step 3: Fix the failures** (root causes), committing each fix separately.

- [ ] **Step 4: Report to the controller:**
  - the counts per project;
  - the size figures against the Task 17 figures;
  - the DataTable perf annotations;
  - the remaining allowlist entries;
  - the section-9 open items;
  - the owner actions: Linux baselines; the L14 superforms decision; the optional Inter font.

---

## 9. Contract for the later page rebuilds (leads / orders / inventory, Tasks 16–26 of 1c)

Every rebuild task must use these and must not hand-roll an equivalent. Import paths are exact.

| Need                                              | Use                                                                                                                                                                                 | Import                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Page title, breadcrumb, actions                   | `PageHeader` (the only `<h1>`)                                                                                                                                                      | `#lib/layouts/PageHeader.svelte`             |
| Route tabs                                        | `SectionNav`                                                                                                                                                                        | `#lib/layouts/SectionNav.svelte`             |
| List page frame                                   | `ResourceListPage` + `SearchInput` + `StatusChips` + `FilterBar` + `FilterChips` + `BulkActionBar`                                                                                  | `#lib/components/data/index.ts`              |
| Any table                                         | `DataTable` (`DataTableColumn<T>`; sorting/selection/pagination modes; `rowHref`; `rowActions`; `footer` for totals, e.g. OrderItemsTable)                                          | `#lib/components/data/data-table/index.ts`   |
| Infinite lists                                    | `createInfiniteList` + `DataTable pagination={{ mode: 'cursor', list }}`                                                                                                            | `#lib/hooks/index.ts`                        |
| Loading / error / empty                           | `QueryState`, or DataTable's built-in                                                                                                                                               | `#lib/components/feedback/index.ts`          |
| Key–value detail                                  | `DescriptionList`                                                                                                                                                                   | `#lib/components/ui/DescriptionList.svelte`  |
| Row menu                                          | `RowActionsMenu`                                                                                                                                                                    | `#lib/components/data/RowActionsMenu.svelte` |
| Person/user cell                                  | `IdentityCell`                                                                                                                                                                      | `#lib/components/data/IdentityCell.svelte`   |
| Copyable id                                       | `IdChip`                                                                                                                                                                            | `#lib/components/data/IdChip.svelte`         |
| Back link                                         | `BackLink`                                                                                                                                                                          | `#lib/components/data/BackLink.svelte`       |
| Create/edit in a side panel                       | `FormSheet` (pass `mutateAsync`; keep the `formId` the e2e spec uses)                                                                                                               | `#lib/components/form/index.ts`              |
| Small form in a modal                             | `FormDialog`                                                                                                                                                                        | `#lib/components/form/index.ts`              |
| Destructive confirm with reason / type-to-confirm | `ReasonConfirmDialog`                                                                                                                                                               | `#lib/components/feedback/index.ts`          |
| Plain confirm                                     | `ConfirmDialog` (`confirmDisabled`)                                                                                                                                                 | `$ui`                                        |
| Server-action form                                | `ActionForm`                                                                                                                                                                        | `#lib/components/form/index.ts`              |
| Fields                                            | `TextField`, `TextareaField`, `PasswordField`, `NumberInput`, `Select`, `Combobox`, `DatePicker`, `DateRangePicker`, `RadioGroup`/`RadioItem`, `Switch`, `TagInput`, `FileDropZone` | `$form` (`#lib/components/form/index.ts`)    |
| Dialog open/target state                          | `createDialogState<T>()`                                                                                                                                                            | `#lib/hooks/index.ts`                        |
| Leave guard                                       | `useLeaveGuard(isDirty)` (FormSheet and ActionForm wire it themselves)                                                                                                              | `#lib/hooks/index.ts`                        |
| Badges for enums                                  | `defineStatusMap` + `Badge variant={view.variant}`                                                                                                                                  | `#lib/utils/status.ts`, `$ui`                |
| Money, dates                                      | `formatMoney` (paise), `formatDate`, `formatDateTime`, `relativeTime`, `parseApiDate`                                                                                               | `#lib/utils/format.ts`                       |
| Error copy                                        | `describeError(err, { noun, verb, conflict })`                                                                                                                                      | `$api/errors`                                |
| Mutations                                         | `createResourceMutation` (`inlineErrors: true` when the surface renders the error)                                                                                                  | `#lib/api/mutations.ts`                      |
| Stats tiles                                       | `StatCard`                                                                                                                                                                          | `$ui`                                        |
| Write gating                                      | `session.can(P.x)` / `ACTION` groups; server `guardAppRoute`                                                                                                                        | `$features/auth`, `#lib/server/guards.ts`    |

**Must remove when rebuilt** (each removal also deletes the file from `scripts/arch/allowlists/phase2-rebuild-pending.json`):

- `ui/drawer` imports:
  - AddBatchDrawer, CreateProductDrawer, EditProductDrawer (inventory)
  - EditLeadDrawer (leads)
  - ReviseQuotationDrawer (orders)
  - BulkUploadDrawer
- Raw tables:
  - BatchesList (inventory)
  - LeadsTable (leads)
  - CreditNotesList, OrderItemsTable, PaymentsList (orders)
- Raw textareas and inputs in:
  - AdjustStockDialog, WriteOffBatchDialog, AddBatchDrawer (inventory)
  - EditLeadDrawer, LogCallDialog, ReassignDialog (leads)
- The legacy `ui/data-table`, used by ProductsList and OrdersList.
  - Delete `ui/data-table/` with the last of these.
  - Delete `ui/drawer/` with the last drawer.
  - Delete `LeadsTable` when the leads list moves to DataTable.
- The `new Promise(… mutate …)` sites (catalogue #12) in inventory, leads and orders.
- `CancelOrderDialog`'s TextField reason (drift C13) → `ReasonConfirmDialog`.

**Catalogue items those tasks close:**

- the leads/orders/inventory occurrences of #1, #2, #3, #4, #5, #6, #7, #11, #12, #18 and #21
- #13 (`api.postForm`/`getBlob`, `api/schemas/{bulk,page}.ts`, `cursorInfiniteOptions`)
- #23 `MembershipPicker` (`features/users/components/`, extracted from ReassignDialog)
- `optionsFromLabels()` (EditLeadDrawer, LogCallDialog, filter-config)
- B: `useOptimisticMutation` in inventory adjustStock; `Timeline` in the remaining timelines

**Visual anchors:** when the leads list and lead detail are rebuilt, move the per-axis visual anchors from `/settings/users` and `/settings/users/[id]` to `/leads` and `/leads/[id]` (spec §8) and regenerate those baselines.

---

## 10. Risks and containment

| Risk                                                     | Where it bites                                                  | Containment (task)                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSP breaks preferences or tests                          | an inline script or style returning; the visual helper          | Task 1 deletes the only inline script and pins its absence (`app-html.test.ts`, `preferences-ssr.spec.ts`). Customizer changes are attribute writes plus static CSS. Task 30 replaces `addStyleTag`. `security-headers.spec.ts` runs in Tasks 1 and 32. |
| SSR flash (theme or locale)                              | first paint before hydration                                    | Attributes and `lang` are written by `transformPageChunk` (Tasks 1, 3); `auto` uses `color-scheme` with no JS (Task 2). The e2e reads the raw HTML (`page.request.get`) to prove it.                                                                    |
| Cross-request leakage on the server                      | the preferences store; svelte-i18n's global locale              | The store comes through context (L4). The locale is set synchronously in the root layout during the synchronous render (L28), proven by the interleaved-requests e2e (Task 3). `ssr-isolation.spec.ts` runs in Tasks 1 and 3.                           |
| a11y regressions from new markup                         | regenerated primitives, shell                                   | Role and name assertions in each component test. The a11y project runs at every checkpoint, in light and dark from Task 17. The contrast gate is over every token combination (Task 2). One `<h1>` per route is asserted (Task 14).                     |
| The busy/reset dialog rules lost in the swap             | Dialog, Sheet, drawer shim, alert-dialog                        | The existing `busy-veto-bound`, `drawer-busy`, `pending-dismissal` and `form-drawer-settle` tests must pass in Task 4. New `sheet-busy` (4), `form-sheet` (18) and `reason-confirm-dialog` (20) tests cover reset on open and stale generations.        |
| Large-table performance and bundle size                  | DataTable                                                       | Virtualise above 100 rows; selection by id. The bench plus perf annotations (Task 24) and the `size` figures are recorded at each checkpoint (informational, D3).                                                                                       |
| e2e selectors break on markup changes                    | every migration task                                            | Each task names the specs to keep green. Selectors move to roles and labels in the same commit (Global Constraints). `form="<id>"` ids are preserved through `formId`. The RowActionsMenu name change is updated in Task 25.                            |
| Regenerated shadcn code violates repo gates              | class stores in the sidebar block; physical CSS; lucide imports | `normalize.mjs` (Task 4) plus the documented local edits (Task 10). `arch:check` runs in every task.                                                                                                                                                    |
| The CLI cannot handle `#lib` aliases or the `nova` style | Task 4 onwards                                                  | A fallback is written into Task 4 Step 4, and recorded in CUSTOMIZATIONS.md.                                                                                                                                                                            |
| TanStack v9 / virtua API differs from this plan's names  | Tasks 23–24                                                     | The public props are LeadKart-owned (L26). The internal names are checked against installed types, with a stated fallback for virtua.                                                                                                                   |
| A big token sweep hides a wrong mapping                  | Task 9                                                          | The codemod has unit fixtures and is idempotent. The parity e2e pins computed colours. The leftover grep is checked, and the gates in Task 16 catch stragglers.                                                                                         |
| Leads/orders/inventory get redesigned by accident        | Tasks 4–16                                                      | Only mechanical changes there. The allowlist names them. Task 29 asserts that the allowlist holds only rebuild-pending files.                                                                                                                           |

---

## 11. Out of scope

- Rebuilding leads, orders or inventory internals (only mechanical compatibility changes; section 9).
- Wiring dashboard data, charts and `layerchart` (Phase 3 item 1).
- The role editor's logic (Phase 3 item 8), the `members/[id]` and `roles/[id]` scope pages, and moving person ids out of URLs (Phase 3 item 4, drift C14).
- RTL layouts (D5: LTR only; the RTL-safety gate stays).
- Language switcher UI and a locale cookie (L28).
- Server-side persistence of preferences per user or tenant (the `PreferencesStorage` interface allows it later).
- Adopting superforms and formsnap (L14), unless the owner reverses that decision.
- Notifications, the topbar Bell, signup/verify, marketplace, credits, dispatch, tasks, invoices, impersonation sessions list.
- Moving the `$`-prefixed aliases to `package.json` `imports` (a separate later commit per spec §4.1).

---

## 12. Conflicts found (for the owner)

**CLAUDE.md vs spec, code and this plan:**

- CLAUDE.md says adapter-static, "SSR banned" and localStorage tokens. The code is adapter-node, the BFF uses SSR, and auth is by cookie.
- CLAUDE.md names tailwind-variants, GlassSurface/Svelte Bits and vaul-svelte as doctrine. None are used, or they are removed by the spec.
- CLAUDE.md says "Inter Variable is locked". `tokens.css` deliberately uses the system stack (2026-05-16). The spec says non-colour tokens are unchanged (L13).
- CLAUDE.md has three text levels (`fg` / `fg-muted` / `fg-subtle`). shadcn has two (L7).
- CLAUDE.md's Rule of Three conflicts with D7 (spec wins for UI).
- CLAUDE.md asks for "pixel-perfect Domiex". The spec keeps today's non-colour tokens: type scale, 0.75rem radius. This plan matches Domiex for layout geometry and structure only.
- CLAUDE.md's "Where to find things" calls the hooks "class-based". They are factories.

**Spec vs code:**

- Spec §4.2 says the preferences SSR plumbing shipped in Phase 1. It did not (L1).
- Spec §5.5 says "every form uses superforms". The forms are built on `useForm` and `failForm`, and the brief marks those as reuse (L14).
- Spec §5.2 says the black-white filter goes "on the app root, not `<html>`, so fixed positioning keeps working". Per the Filter Effects spec it is the reverse (L6).
- Spec §3 says vaul is removed. `ui/drawer` has 14 importers, including leads/orders/inventory, which may not be redesigned now (L17).
- Spec names the describer `describeApiError`. The code has `describeError` (kept; there is no second one).
- Spec §8's visual anchors include leads pages, which will be rebuilt after Phase 2 (L29).
- Spec §8 and §4.3 install `@testing-library/svelte`. The owner brief says use `mount` unless approved. The 1c Task 15 brief also assumed it.
- Spec `data-sidebar` on `<html>` collides with the shadcn sidebar's internal `data-sidebar` attributes (L20).
- Spec §5.4 "tier derivation moves out of the layout": already done (the nav is permission-filtered).

**Domiex vs requirements:**

- Domiex's step-500 primaries fail AA with white text (L10).
- Domiex `auto` mode never sticks: its tile calls `setLayoutTheme('light')`.
- Domiex inputs have no focus ring; we keep `focus-visible` rings.
- Domiex's footer is absolutely positioned and overlaps long pages; ours is in flow.
