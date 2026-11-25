# Pebble World Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase 2 UI foundation into the Pebble World design system: foundations, components and the OS shell. Every page then composes it.

**Architecture:** Evolve in place (spec §3, approach A).

- **Tokens:** three layers, `palettes.css` → `semantic.css` → `materials.css`, plus `tokens.css` `@theme`. They are switched by `<html data-*>` attributes from the `lk_ui` cookie, applied at SSR.
- **Primitives** keep their APIs and change skin through cva variants.
- **Generic patterns** are built once, extending existing primitives wherever one already covers the job (DRY).
- **The shell** (Topbar + Dock + phone tab bar) is driven by one app catalogue (`src/lib/config/nav.ts`).

**Tech Stack:**

- SvelteKit 2 (adapter-node BFF), Svelte 5 runes, Tailwind 4, bits-ui v2, cva, lucide via `$icons`, vaul-svelte, svelte-sonner, LayerChart, TanStack Table;
- Vitest 4 (run from PowerShell), Playwright (chromium/firefox/webkit, visual, a11y, perf);
- culori in the contrast gate.

**Spec:** `docs/superpowers/specs/2026-11-25-pebble-world-theme-design.md` (approved 2026-11-25; all five protected-file approvals granted). Visual reference: `.superpowers/brainstorm/8719-1795528735/content/universe-themes-v8.html`, tab 08; sources in `.superpowers/brainstorm/universe-src/themes/world/` (`10-core.css` tokens, `20-shell.css` shell, `40-comps.css` components).

## Global Constraints

- **DRY is top priority (owner, 2026-11-25):** build once, reuse everywhere. Before creating any file, grep for an existing primitive, pattern or helper that does the job and extend it with a variant or prop. A second similar occurrence means extract. Pages never restyle or re-implement a system part.
- **Tokens only:** no hex, rgb or oklch outside `src/styles/tokens.css` and `src/styles/theme/*.css` (stylelint plus `check-tokens`). Logical CSS only (`check-rtl-safety`). `focus-visible`, never bare `focus:`.
- **Palettes:** `iris` (default), `ocean`, `coral`, `emerald`. Logo/button/text/ink/K hexes are exactly the spec §4.1 table.
- **App colours** come from spec §4.1. Each carries a white glyph at ≥ 3:1. App colours are never status and never buttons.
- **Status colours** are fixed across palettes. Counts are neutral; red means overdue/at-risk only.
- **Contrast floors:** text ≥ 4.5:1; controls, field borders, meters, switch tracks and focus rings ≥ 3:1; tonal ink ≥ 4.5:1. Nothing a person reads is under 12 px.
- **Glass** is only on the top bar, dock, ⌘K/notifications/New overlays and the auth card. Popovers, menus, dialogs, sheets and toasts are milk (no blur). The blur limits in `tests/e2e/material-budget.spec.ts` stay at 3 (desktop over moving content), 2 (coarse pointer) and 4 (any state).
- **Dock:** one shape on every screen. Only `data-dock` (bottom|side), `data-dock-autohide` and container height < 560 px change it. It never changes per app.
- **Breakpoints** are container queries: `AppFrame` has 3 panes at ≥ 1100 px, 2 at ≥ 760 px, 1 below; the phone shell is ≤ 640 px container width, or coarse pointer and ≤ 760 px.
- **Size:** CSS ≤ 60 KB gzip; critical path ≤ 120 KB (`npm run size`, `npm run size:critical`, built with `NODE_ENV=production`; the owner's `.env.local` sets development).
- **Do not change:**
  - `src/routes/(app)/+layout.svelte`, byte-for-byte; `AppShell` keeps `children` + `banner`;
  - hash-pinned server files;
  - `.dependency-cruiser.cjs` rule strength;
  - arch gates or CI thresholds made weaker to get green;
  - `check-raw-elements` allowlist growth.
- **Protected-file approvals granted:**
  1. re-record `tests/e2e/fixtures/tokens-light-leadkart.json` as `tokens-light-iris.json` with `LK_RECORD_TOKENS=1`, never by hand;
  2. visual baselines regenerate only via CI `[regen-visuals]` in a commit **subject**, at an owner-approved push;
  3. retire the axes `layout, navType, contentWidth, sidebar, sidebarColors, darkPalette` and mode `black-white`;
  4. commit the reference to `docs/design/pebble-world/reference.html`;
  5. rewrite the shell specs, with limits unchanged and every retired spec replaced in the same commit.
- **Process:**
  - Branch `feat/ui-foundation` only, no worktrees. Never `--no-verify`, amend, rebase or squash. No push without the owner's explicit OK for that push.
  - Files change only through Edit/Write; format by applying read-only prettier output by hand.
  - Vitest runs from PowerShell. e2e spec files are named explicitly, one batch at a time; stop only what you start.
  - English only (`hi.json` is frozen).
- **Commits** end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (implementers) or the Opus line (controller).

## Review Focus

1. **A stale or garbled `lk_ui` cookie** (v1, a removed axis such as `layout=horizontal`, `colors=teal`, or `mode=black-white`) must give defaults per field, valid `<html>` attributes at SSR, and no crash. Tested in Task 1.
2. **200% zoom, 1093×614 and a phone on its side:** the dock and bar bands still leave a working area; a focused element is never hidden under the dock or bar (WCAG 2.4.11); the dock tucks under 560 px height. Tested in Tasks 15 and 18.
3. **Forced colours, reduced transparency and `prefers-contrast: more`:** every clay and trough control keeps a visible edge, and glass turns solid. Tested in Task 3.
4. **A viewer with very few apps** (a new member: Home + Settings only): the dock shows 2 pebbles centred; the phone tab bar shows fewer than 4 tabs with no empty **More**. Tested in Tasks 13 and 16.
5. **A viewer with many apps** (LeadKart staff inside a company, at 768 px): the dock scrolls inside itself, keeps names and never wraps or overflows the page. Tested in Task 15.

---

## Stage 1: Foundations

### Task 1: Preferences schema v2 (colour axes and new axes)

Layout axes (`layout, navType, contentWidth, sidebar, sidebarColors`) stay until Task 17, because the current shell reads them. This task changes only the colour axes and adds the new ones.

**Files:**

- Modify: `src/lib/features/preferences/schema.ts`, `codec.ts`, `legacy.ts`, `store.svelte.ts` (attribute writes only if needed)
- Modify: `src/lib/layouts/customizer-config.ts`, `src/lib/layouts/mode-toggle.ts`, `src/lib/server/html-shell.ts` (only if it names axes)
- Test: `tests/unit/preferences/codec.test.ts`, `tests/unit/preferences/store.test.ts`, `tests/unit/layouts/customizer-config.test.ts`, `tests/unit/layouts/mode-toggle.test.ts`, `tests/e2e/preferences-ssr.spec.ts`

**Interfaces:**

- Produces:
  - `PREFERENCE_VALUES.palette = ['iris','ocean','coral','emerald']`
  - `mode = ['light','dark','auto']`
  - `dock = ['bottom','side']`
  - `autoHideDock = ['off','on']`
  - `density = ['comfortable','compact']`
  - `transparency` unchanged
- Attributes: `palette → data-palette`, `dock → data-dock`, `autoHideDock → data-dock-autohide`, `density → data-density`.
- Removed: `colors`, `darkPalette`, mode `black-white`.
- `PREFERENCES_COOKIE_VERSION = 2`, exported from `codec.ts`. `decodePreferences(raw)` returns `DEFAULT_PREFERENCES` unless the payload's `v === 2`.

- [ ] **Step 1: Write the failing tests** in `codec.test.ts`:
  - `decodes a v1 cookie to defaults`: encode `{v:1, colors:'teal', mode:'dark'}` → `decodePreferences` equals `DEFAULT_PREFERENCES`.
  - `drops removed values per field`: `{v:2, palette:'teal', mode:'black-white', dock:'side'}` → `{...DEFAULT_PREFERENCES, dock:'side'}`.
  - `round-trips every axis`.
  - `htmlAttributes writes data-palette, data-dock, data-dock-autohide, data-density and no data-colors/data-dark-palette`.
- [ ] **Step 2: Run red.** Run: `npx vitest run tests/unit/preferences --project client`. Expected: FAIL.
- [ ] **Step 3: Implement** the schema change and the version check in `decodePreferences`.
  - Update `customizer-config.ts`: the palette group becomes a `swatch` kind; the dock, autoHideDock and density groups become `wireframe` kind; darkPalette is removed.
  - `quickModeTarget('auto')` stays null.
- [ ] **Step 4:** Update the other listed unit tests and `preferences-ssr.spec.ts`. Its SSR assertion becomes `data-palette="iris"` and `data-dock="bottom"`.
- [ ] **Step 5: Run green.**
  - `npx vitest run tests/unit/preferences tests/unit/layouts --project client`
  - `npx playwright test tests/e2e/preferences-ssr.spec.ts --project=chromium`
  - `npm run check`
- [ ] **Step 6: Commit** `feat(prefs): schema v2 colour axes (palette, mode) and dock, auto-hide, density; v1 cookies decode to defaults`

### Task 2: Palettes, semantic roles, dark design, contrast gate v3

**Files:**

- Modify: `src/styles/theme/palettes.css`, `src/styles/theme/semantic.css`, `src/styles/tokens.css` (`@theme inline` bridge for the new roles)
- Modify: `scripts/arch/check-token-contrast.mjs` (`AXES`, `ATTRIBUTE_FOR`, `RAW_PAIRS`)
- Modify: `src/lib/layouts/CustomizerTile.svelte` (swatch = logo tile per palette)
- Rename + re-record: `tests/e2e/fixtures/tokens-light-leadkart.json` → `tokens-light-iris.json` (`LK_RECORD_TOKENS=1`); update `tests/e2e/tokens-probe.spec.ts` and `tokens-parity.spec.ts`
- Rewrite: `tests/unit/styles/brand-palette.test.ts`; update `tests/unit/contract/arch-token-contrast*.test.ts`, `customizer-gate.test.ts`

**Interfaces:**

- Produces, in the reference layer:
  - `--palette-{iris|ocean|coral|emerald}-{50..950}`
  - `--palette-{iris|ocean|coral|emerald}-k-{50..950}` (the K piece)
  - `--app-{home|leads|orders|stock|dispatch|payments|reports|team|settings|companies|people}`
- Produces, in the semantic layer (light-dark pairs):
  - kept: `--primary*`, status, surfaces;
  - new: `--brand-2`, `--brand-2-soft`, `--primary-tonal`, `--primary-tonal-foreground`, `--field-border`, `--meter-track`, `--focus-ring`, `--badge-count`, `--badge-count-foreground`, `--wall-1`, `--wall-2`, `--wall-3`, `--app-accent`;
  - one `.app-<key>` scope sets `--app-accent: var(--app-<key>)`.
- Tailwind names: `bg-primary-tonal`, `text-primary-tonal-foreground`, `border-field`, `bg-meter-track`, `ring-focus`, `bg-wall-*`, `bg-app-accent`.

- [ ] **Step 1: Write the failing gate tests** in `tests/unit/contract/arch-token-contrast.test.ts`:
  - `AXES.palette` equals `['iris','ocean','coral','emerald']` and `AXES.mode` equals `['light','dark']`;
  - `AXES` has no `darkPalette` / `colors`;
  - the gate passes on the repo;
  - pairs exist for:
    - `primary-tonal-foreground` on `primary-tonal` (4.5);
    - `field-border` on `card` and on `muted` (3);
    - `meter-track` vs `primary-indicator` (3);
    - `focus-ring` on `background` and `card` (3);
    - white on each `--app-*` (3).
- [ ] **Step 2: Run red.** Run: `npx vitest run tests/unit/contract/arch-token-contrast.test.ts --project server`. Expected: FAIL on axes.
- [ ] **Step 3: Implement** the four ramps in oklch so steps hit the spec's button/text/ink hexes.
  - Delete the old ramps (`leadkart…amber`, `capsule`) and the zinc/stone/neutral/gray dark families. Keep one neutral family.
  - Keep the `--swatch-sidebar-*` tokens and the `data-sidebar-colors` blocks until Task 17, because the current sidebar still reads them.
  - Add `:root[data-palette='…']` blocks in `semantic.css` re-pointing `--primary-*` and `--brand-2*`.
  - Design dark values on the same roles: dark neutral wall, clay surfaces one step lighter than the wall, the same status tokens.
  - Darken the dispatch, stock and reports app colours until white reaches ≥ 3:1.
- [ ] **Step 4:** Update the gate `AXES` (`palette`, `mode: ['light','dark']`; keep `sidebarColors` and `transparency` until Task 17) and `RAW_PAIRS`. Remove black-white measuring.
- [ ] **Step 5:**
  - Rewrite `brand-palette.test.ts`: every palette declares `--primary` steps and `--brand-2`, and the hexes of spec §4.1 resolve within ΔE ≤ 2.
  - Re-record the token fixture as `tokens-light-iris.json`: `$env:LK_RECORD_TOKENS='1'; npx playwright test tests/e2e/tokens-probe.spec.ts --project=chromium`.
  - Delete the old fixture file in the same commit.
- [ ] **Step 6: Run green.**
  - `npm run arch:check`
  - `npx vitest run tests/unit/contract tests/unit/styles --project server --project client`
  - `npx playwright test tests/e2e/tokens-probe.spec.ts tests/e2e/tokens-parity.spec.ts --project=chromium`
  - `npm run lint:css`
- [ ] **Step 7: Commit** `feat(tokens): Iris/Ocean/Coral/Emerald palettes, app identity colours, tonal/field/meter/focus roles, dark design; contrast gate v3`

### Task 3: Materials, shape, space, density, motion

**Files:**

- Modify: `src/styles/theme/materials.css`, `materials-fallbacks.css`, `layouts.css` (shell geometry tokens), `src/styles/tokens.css` (radius, density, motion), `src/styles/utilities.css` (`@utility` per material)
- Modify: overlay primitives that use `material-pane` → `material-milk`: `ui/dialog`, `sheet`, `alert-dialog`, `popover`, `dropdown-menu`, `select`, `sonner`, `ConfirmDialog`, `form/FormDialog`, `form/FormSheet`. Grep `material-pane` for the full list.
- Test: `tests/unit/styles/materials.test.ts`, `tests/unit/contract/arch-token-contrast-materials.test.ts`, `tests/e2e/materials-computed.spec.ts`, `tests/e2e/material-fallbacks.spec.ts`

**Interfaces:**

- Produces utilities: `material-bar` (glass, unchanged recipe), `material-milk`, `material-sheet`, `material-clay`, `material-clay-sm`, `material-pebble`, `material-tray`, `material-trough`.
- Produces tokens:
  - shadows: `--shadow-clay`, `--shadow-clay-sm`, `--shadow-pebble`, `--shadow-inset`, `--shadow-float`;
  - fills: `--tray`, `--trough`;
  - radii: `--radius-sheet`, `--radius-card`, `--radius-control`, `--radius-pebble`;
  - density: `--density-row`, `--density-pad` (two values, switched by `:root[data-density='compact']`);
  - motion: `--press-scale: 0.96`, `--lift: 2px`, `--duration-app: 150ms`.
- Shell geometry: `--shell-pad`, `--shell-gut`, `--shell-bar`, `--shell-rail`, `--shell-dock-pebble`, `--shell-dock-band`, as clamp() with `cqw`/`cqh` against the `desk` container (values from reference `20-shell.css` `--world-*`).
- `material-pane` is removed; `material-milk` is its successor with no `backdrop-filter`.

- [ ] **Step 1: Write the failing tests:**
  - `materials.test.ts`: each new utility exists; `material-milk` has no backdrop-filter; every clay/trough utility sets a `1px solid transparent` border; fallbacks restate `off` for clay.
  - `materials-computed.spec.ts`: on `/styleguide`, a trough's computed border colour under `forced-colors: active` is not transparent, and glass is opaque under `prefers-reduced-transparency`.
- [ ] **Step 2: Run red.**
  - `npx vitest run tests/unit/styles --project client`
  - `npx playwright test tests/e2e/materials-computed.spec.ts --project=chromium`
- [ ] **Step 3: Implement** the recipes from reference `10-core.css` (`--up`, `--up-s`, `--in`, `--rim`, `--float`), expressed through tokens.
  - Migrate the `material-pane` consumers to `material-milk`.
  - Add the material pairs (field border over trough, tray over sheet) to the gate.
- [ ] **Step 4: Run green.**
  - Steps 1–2 commands
  - `npx playwright test tests/e2e/material-budget.spec.ts tests/e2e/material-fallbacks.spec.ts --project=chromium` (limits unchanged)
  - `npm run arch:check`
  - `npm run lint:css`
- [ ] **Step 5: Commit** `feat(materials): milk, sheet, clay, pebble, tray, trough; shape, density and motion tokens; overlays move to milk`

### Task 4: Catalogue foundations page, reference committed, Stage 1 checkpoint

**Files:**

- Modify: `src/routes/(dev)/styleguide/+page.svelte` (split into sections)
- Create: `src/routes/(dev)/styleguide/Foundations.svelte` (palettes × modes swatches, type scale, space, radius, materials, motion)
- Create: `docs/design/pebble-world/reference.html` (`node .superpowers/brainstorm/universe-src/build.mjs --only=world --out=docs/design/pebble-world/reference.html`) and `docs/design/pebble-world/README.md` (what it is, how to rebuild it)

- [ ] **Step 1:** Build Foundations from tokens only, reading them by name. Live palette/mode switching uses the preferences store.
- [ ] **Step 2:** Run `npm run check`, `npm run arch:check`, and `npx playwright test tests/a11y/routes.spec.ts --project=a11y -g styleguide`. Expected: green.
- [ ] **Step 3: Commit** `feat(catalogue): foundations page; commit the Pebble World reference`.
- [ ] **Step 4: Stage 1 checkpoint:**
  - Opus review of Tasks 1–4.
  - Screenshots of `/styleguide` and `/dashboard` for 4 palettes × light/dark at 1440×900, 1093×614 and 360×780 go to the owner. **Dark mode needs the owner's OK before Stage 2.**

## Stage 2: Components

DRY rule for every task here: extend the existing primitive's cva variants. New files only where no primitive covers the job.

### Task 5: Button, Badge, StatusPill, count badge

**Files:**

- Modify: `src/lib/components/ui/button/button.svelte`, `ui/badge/badge.svelte`, `ui/StatusPill.svelte`
- Test: the existing tests under `tests/unit/components/` for button, badge and status pill (grep), plus new cases

**Interfaces:**

- Button `variant`: `primary | tonal | secondary | ghost | destructive | link` (`default` → `primary`, `outline` → `secondary`; rename call sites in the same commit). `size`: `sm | md | lg | icon`, plus `loading`.
- Badge `variant` adds `count` (neutral) and `count-urgent`.
- StatusPill keeps its API: status tint + word + glyph.

- [ ] **Step 1: Failing tests:**
  - each variant renders its class set;
  - `tonal` uses `bg-primary-tonal text-primary-tonal-foreground`;
  - `primary` press uses `--press-scale` under `motion-safe` only;
  - `Badge variant="count"` has an accessible text;
  - `count-urgent` uses the danger tokens.
- [ ] **Step 2: Run red.** `npx vitest run tests/unit/components --project client`.
- [ ] **Step 3: Implement** in cva, then migrate call sites (grep `variant="default"` and `variant="outline"`).
- [ ] **Step 4: Run green:** the same command, `npm run check`, and `npm run arch:check`.
- [ ] **Step 5: Commit** `feat(ui): clay buttons (primary/tonal/secondary/ghost/destructive/link) and neutral/urgent count badges`

### Task 6: Fields and choice controls

**Files:**

- Modify: `ui/input`, `ui/textarea`, `ui/select`, `ui/command` (combobox input), `ui/date-field`, `ui/calendar`, `ui/checkbox`, `ui/radio-group`, `ui/switch`, `ui/slider`, `ui/toggle-group`, `ui/toggle`, `ui/tabs`, `ui/field`
- Test: the existing component tests for each, plus `tests/e2e/materials-computed.spec.ts` cases

**Interfaces:**

- No API changes.
- Fields use `material-trough` + `border-field` + `ring-focus`.
- Toggle-group/tabs `variant="segmented"` (tray + clay thumb) becomes the default for tabs.

- [ ] **Step 1: Failing tests:**
  - each field root carries `material-trough` and `border-field`;
  - Switch off-track contrast vs card ≥ 3:1, asserted through the contrast gate pair added in Task 2;
  - Tabs default variant is `segmented`.
- [ ] **Step 2: Run red.**
- [ ] **Step 3: Implement.** Grep `TextField`/`PasswordField` in `src/lib/components/form/` and route them through the same field classes; no copies.
- [ ] **Step 4: Run green:** unit tests, `npm run check`, `npm run arch:check`, and `npx playwright test tests/e2e/materials-computed.spec.ts --project=chromium`.
- [ ] **Step 5: Commit** `feat(ui): trough fields with 3:1 edges, clay choice controls, segmented tabs`

### Task 7: Containers and overlays

**Files:**

- Modify: `ui/card/*`, `ui/StatCard.svelte`, `ui/EmptyState.svelte`, `ui/skeleton`, `ui/alert`, `ui/dialog`, `ui/alert-dialog`, `ui/sheet`, `ui/drawer`, `ui/popover`, `ui/dropdown-menu`, `ui/tooltip`, `ui/sonner`, `ui/command`, `ui/AuthCard.svelte`
- Test: the existing component tests, plus `tests/e2e/material-budget.spec.ts` (unchanged limits)

**Interfaces:**

- Card: `surface` prop `clay` (default) | `sheet` | `tray`.
- StatCard gains `timeframe: string` (required) and `comparison?: string`. It **is** the spec's KpiTile; no new component.
- Alert gains `variant="tray"` with `tone: 'warning' | 'danger' | 'info' | 'neutral'`. It **is** the spec's StatusTray; no new component.
- Overlays use `material-milk`. Command/⌘K and AuthCard use `material-bar` (glass).

- [ ] **Step 1: Failing tests:**
  - Card default has `material-clay`;
  - StatCard renders its `timeframe` text;
  - Alert `tray` renders a tinted tray with a word, not colour alone;
  - Dialog content has no `backdrop-filter` class.
- [ ] **Step 2: Run red.**
- [ ] **Step 3: Implement.** Update StatCard call sites (dashboards) with a timeframe string from the existing i18n keys, or new en.json keys.
- [ ] **Step 4: Run green:** unit tests, `npm run check`, and `npx playwright test tests/e2e/material-budget.spec.ts --project=chromium`.
- [ ] **Step 5: Commit** `feat(ui): clay cards, KPI StatCard with time frame, tray alerts, milk overlays, glass command`

### Task 8: Data components and chart theme

**Files:**

- Modify: `ui/data-table/*`, `ui/table`, `ui/timeline`, `ui/kanban`, `ui/progress/Progress.svelte`, `ui/stepper/*`, `ui/pagination`
- Create: `src/lib/components/data/chart-theme.ts`, only if LayerChart is already a dependency; otherwise skip and note it for the Phase B-data work

**Interfaces:**

- DataTable `density` defaults from `getPreferences().density`; an explicit prop still wins. The table sits on `material-sheet`; the bulk bar stays `material-bar`.
- Progress gains `variant="meter"` (fat trough + brand or app fill, label + value). It **is** the spec's Meter.
- Stepper gains `variant="stones"` (clay stones, current = brand, done = success; a step may be a button for filtering via `onselect`). It **is** the spec's StageStones.
- `chartTheme(): { series: string[]; status: Record<'success'|'warning'|'danger'|'info', string> }` reads CSS variables at runtime.

- [ ] **Step 1: Failing tests:**
  - DataTable picks `compact` when the store says compact and the prop is unset;
  - Progress `meter` has `role="meter"` with `aria-valuenow`;
  - Stepper `stones` fires `onselect(stepKey)` and marks the current step `aria-current="step"`.
- [ ] **Step 2: Run red.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run green** (unit, check, arch).
- [ ] **Step 5: Commit** `feat(ui): sheet tables with density preference, meter progress, stage-stone stepper, chart theme`

### Task 9: Brand mark, app pebble, static icons

**Files:**

- Create: `src/lib/components/ui/AppPebble.svelte`
- Modify: `ui/BrandMark.svelte` (the LK "Two Cuts" monogram from `.superpowers/brainstorm/logo-src/lk/`, monogram 6), `ui/BrandIcon.svelte` (composes AppPebble), `ui/avatar` (pebble shape)
- Create: `scripts/brand/generate-icons.mjs` (writes `static/favicon.svg`, the PNG sizes, apple-touch, maskable, the mstile and `static/manifest.webmanifest` `theme_color`, all from the Iris tokens; updates `src/app.html` `theme-color`); add an npm script `brand:icons`
- Rewrite: `tests/unit/components/brand.test.ts` (keep the wordmark sha256 pin); update `tests/e2e/brand.spec.ts`

**Interfaces:**

- `AppPebble` props: `app?: AppKey`, `icon?: Component`, `size: 'xs'|'sm'|'md'|'lg'`, `label?: string`. With `app`, colour = `--app-<key>`; else brand.
- `BrandMark` props unchanged (`mono`, `wordmark`, `tone`). The L uses `--primary`, the K uses `--brand-2`.
- `AppKey` type is exported from `src/lib/config/nav.ts` in Task 13. Until then, declare `export type AppKey = 'home' | 'leads' | 'orders' | 'stock' | 'dispatch' | 'payments' | 'reports' | 'team' | 'settings' | 'companies' | 'people'` there in this task.

- [ ] **Step 1: Failing tests:**
  - BrandMark contains no colour literals;
  - it uses `--primary` and `--brand-2`;
  - its geometry matches the monogram 6 path set;
  - AppPebble `app="orders"` sets `--app-accent` and has `aria-hidden` when no label;
  - the `generate-icons.mjs --check` mode exits 1 when `theme_color` differs from the Iris token.
- [ ] **Step 2: Run red.**
- [ ] **Step 3: Implement**, run `npm run brand:icons`, and commit the generated assets.
- [ ] **Step 4: Run green:** unit tests, `npx playwright test tests/e2e/brand.spec.ts --project=chromium`, `node scripts/brand/generate-icons.mjs --check`.
- [ ] **Step 5: Commit** `feat(brand): LK Two Cuts monogram, app pebble, generated icons and theme colour`

### Task 10: Layout patterns (AppFrame, SectionNav, ActionFooter, ListRow)

**Files:**

- Create: `src/lib/components/layout/AppFrame.svelte`, `src/lib/components/data/ListRow.svelte`
- Modify: `src/lib/layouts/SectionNav.svelte` (becomes generic: list at width, segmented or popover when narrow)
- Create: `src/lib/components/form/ActionFooter.svelte`; make `.form-footer` users (`form/ActionForm.svelte`, FormDialog, FormSheet) render through it
- Update `scripts/arch/check-form-submit-canon.mjs` to accept `ActionFooter` as the canon. It must stay as strict: a submit outside it still fails.
- Test: `tests/unit/components/app-frame.test.ts`, `list-row.test.ts`, `action-footer.test.ts`; `tests/e2e/app-frame-reflow.spec.ts`

**Interfaces:**

- `AppFrame` snippets: `nav?`, `list`, `detail?`, `footer?`. Prop `detailOpen: boolean` (bindable) for one-pane mode. Container type `inline-size`, name `app-frame`. Steps: 3 panes ≥ 1100 px, 2 ≥ 760 px, 1 below.
- `SectionNav` props: `items: { href: string; label: string; count?: number }[]`, `label: string`.
- `ActionFooter` snippet `children`, prop `align: 'end' | 'between'`.
- `ListRow` snippets: `leading?`, `title`, `sub?`, `meta?`, `amount?`, `trailing?`; prop `href?` (renders an `<a>`) or `onclick?` (renders a `<button>`). Title and amount never truncate to nothing (min-width rules).

- [ ] **Step 1: Failing tests:**
  - AppFrame renders three regions at 1200 px container width, two at 800, one at 500 (`app-frame-reflow.spec.ts` on a catalogue fixture route, at viewport 360 and 1280×720 zoom 2);
  - no horizontal scroll (`scrollWidth <= clientWidth`);
  - ListRow title and amount are visible at 320 px.
- [ ] **Step 2: Run red.**
- [ ] **Step 3: Implement.** Migrate existing SectionNav callers in the same commit.
- [ ] **Step 4: Run green:** unit tests, the reflow spec on chromium, `npm run arch:check` (form-submit canon, loc budgets).
- [ ] **Step 5: Commit** `feat(patterns): AppFrame with container step-downs, generic SectionNav, ActionFooter, ListRow`

### Task 11: Widget patterns (WidgetCard, WidgetGrid, LinkedRecords)

**Files:**

- Create: `src/lib/components/data/WidgetGrid.svelte`, `src/lib/components/data/LinkedRecords.svelte`
- WidgetCard = `Card` + `Card.Header` with a new `Card.Header` prop `icon?: Component` + `app?: AppKey` + snippet `action?`. No new component file (DRY).
- Test: `tests/unit/components/widget-grid.test.ts`, `linked-records.test.ts`

**Interfaces:**

- `WidgetGrid` snippet `children`. Children set `style="--span: N"` (1–12) through a `span` prop on `Card`. 12 columns ≥ 1100 px container, 6 at ≥ 760, 1 below; spans clamp to the column count.
- `LinkedRecords` prop `items: { href: string; label: string; app?: AppKey }[]`, rendered as a list of links with an app pebble (xs).

- [ ] **Step 1: Failing tests:** `span` 8 at 1200 px becomes 6 at 800 px and full at 500 px; LinkedRecords renders `<nav aria-label>` with links.
- [ ] **Step 2: Run red.** **Step 3: Implement.** **Step 4: Run green.**
- [ ] **Step 5: Commit** `feat(patterns): widget grid, widget card header, linked records`

### Task 12: Catalogue complete, Stage 2 checkpoint

**Files:**

- Create: `src/routes/(dev)/styleguide/Components.svelte`, `Patterns.svelte`; update `Fields.svelte`, `Overlays.svelte`
- Modify: `tests/visual/routes/matrix.visual.spec.ts` (axes from `PREFERENCE_VALUES`, already imported); add a `catalogue.visual.spec.ts` shooting each styleguide section in iris light/dark plus one shot per other palette
- Modify: `tests/a11y/routes.spec.ts` (catalogue sections)

- [ ] **Step 1:** Render every primitive and pattern with its states (default, hover via a `data-state` prop where supported, focus, disabled, loading, error).
- [ ] **Step 2:** Run green: `npm run check`, `npm run arch:check`, `npx playwright test tests/a11y/routes.spec.ts --project=a11y`. The visual specs are not run locally (Linux CI baselines).
- [ ] **Step 3: Commit** `feat(catalogue): every component and pattern in every palette and mode`
- [ ] **Step 4: Stage 2 checkpoint:** Opus review of Tasks 5–12; full `npm run test:coverage` and `npm run test:e2e` once; catalogue screenshots go to the owner.

## Stage 3: Shell

### Task 13: App catalogue

**Files:**

- Modify: `src/lib/config/nav.ts` (`NAV_ROUTES` stays; add `APPS`), `src/lib/config/nav-icons.ts`
- Test: `tests/unit/config/nav.test.ts` (or the existing nav test file; grep), `tests/e2e/role-aware-shell.spec.ts`

**Interfaces:**

- `export interface App { key: AppKey; label: string; icon: Component; routes: NavRouteKey[]; phonePriority: number; create?: { label: string; href: string; access: AccessRule }[]; count?: () => Promise<{ n: number; urgent: boolean } | null> }`
- `export const APPS: readonly App[]`, with apps per spec §6.5 (Home, Leads, Orders, Stock, Team, Settings, Companies, People). Access comes from the routes' existing `access`/`context`: an app is visible when any of its routes `canSee`.
- `export function visibleApps(caps: Caps, inTenantContext: boolean): App[]`
- `export function appForPath(pathname: string): App | null`
- `/permission-requests` belongs to Settings; Team gets a filtered section link only for viewers who can approve.
- `routeForPath` and the server guards are unchanged.

- [ ] **Step 1: Failing tests:**
  - a member with no extra permissions sees `[home, settings]`;
  - a tenant admin sees `home, leads?, …, team, settings` per caps;
  - LeadKart staff with scope set see `home, companies, leads, orders, stock` and not `team`/`settings`;
  - `appForPath('/settings/roles/x')` is `team`;
  - `appForPath('/permission-requests')` is `settings`.
- [ ] **Step 2: Run red.** **Step 3: Implement.** **Step 4: Run green**, plus the guard tests (`tests/unit/server/*guard*`).
- [ ] **Step 5: Commit** `feat(shell): app catalogue drives dock, tab bar and breadcrumbs`

### Task 14: Top bar

**Files:**

- Modify: `src/lib/layouts/Topbar.svelte`, `src/lib/layouts/UserMenu.svelte`
- Create: `src/lib/layouts/shell-context.svelte.ts` (factory `createShellContext()`: `hasPrimaryAction` flag, `crumbs`)
- Create: `src/lib/layouts/BellButton.svelte` (count + popover slot, no data wiring)
- Test: `tests/unit/layouts/topbar.test.ts`, `shell-context.test.ts`

**Interfaces:**

- `createShellContext(): { readonly hasPrimaryAction: boolean; setPrimaryAction(on: boolean): void; readonly crumbs: Crumb[]; setCrumbs(c: Crumb[]): void }`, set in context by AppShell. `Crumb = { label: string; href?: string }`.
- New uses Button `primary` when `!hasPrimaryAction`, else `tonal`. Its menu lists the `create` entries of `visibleApps`.
- The breadcrumb is `Home › {app.label} › …crumbs`, built from `appForPath`.
- `BellButton` props: `count: number`, `urgent: boolean`; snippet `children` (the popover body).

- [ ] **Step 1: Failing tests:**
  - New renders `primary` by default and `tonal` after `setPrimaryAction(true)`;
  - the crumb reads "Home › Team" on `/settings/roles`;
  - below 1000 px container width the crumb text is visually hidden but its accessible name stays;
  - the search trough opens CommandPalette on Ctrl+K.
- [ ] **Step 2: Run red.** **Step 3: Implement** (glass `material-bar` capsule). **Step 4: Run green.**
- [ ] **Step 5: Commit** `feat(shell): glass top bar with breadcrumb, search trough, brand New, bell slot, user pill`

### Task 15: Dock and shortcuts

**Files:**

- Create: `src/lib/layouts/Dock.svelte`, `src/lib/layouts/dock-keys.ts` (roving focus + `g` chord map), `src/lib/layouts/ShortcutSheet.svelte`
- Modify: `src/styles/theme/layouts.css` (dock tokens per `data-dock` and `data-dock-autohide`, tuck under 560 px container height)
- Test: `tests/unit/layouts/dock.test.ts`, `dock-keys.test.ts`; `tests/e2e/dock.spec.ts`

**Interfaces:**

- `Dock` props: `apps: App[]`, `current: AppKey | null`, `counts: Partial<Record<AppKey, { n: number; urgent: boolean }>>`.
- `dockChord(key: string): AppKey | null` and `nextIndex(current: number, key: 'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown'|'Home'|'End', length: number, orientation: 'horizontal'|'vertical'): number`.

- [ ] **Step 1: Failing tests:**
  - **Same shape everywhere (the owner's rule):** the dock's bounding box on `/dashboard` equals its box on `/settings/roles`, and every `.dock-item`'s computed width is identical across routes.
  - `data-dock="side"` puts the dock left with content offset by `--shell-rail`.
  - Auto-hide on: the dock is translated off-screen until Tab focus.
  - Height 520 px: tucked with a handle.
  - At 768 px with 6 apps: the dock scrolls inside itself, `document.scrollingElement.scrollWidth <= innerWidth`.
  - The focused dock item is not covered by any other element (`elementFromPoint` at its centre is itself).
  - `g` then `t` goes to Team when visible.
  - `?` opens ShortcutSheet.
  - The accessible name includes the count ("Orders, 7").
- [ ] **Step 2: Run red.**
- [ ] **Step 3: Implement** from reference `20-shell.css` with tokens, one component for both positions.
- [ ] **Step 4: Run green.** `npx playwright test tests/e2e/dock.spec.ts --project=chromium`, then firefox and webkit once.
- [ ] **Step 5: Commit** `feat(shell): one-shape dock (bottom or side), auto-hide, short-screen tuck, roving focus, g-chords, shortcut sheet`

### Task 16: Phone tab bar

**Files:**

- Create: `src/lib/layouts/TabBar.svelte`
- Modify: `src/lib/components/ui/data-table/*` bulk bar (in the phone shell it renders into the tab bar's slot)
- Test: `tests/unit/layouts/tabbar.test.ts`; `tests/e2e/tabbar.spec.ts` (viewport 390×844, `hasTouch`)

**Interfaces:**

- `TabBar` props: `apps: App[]` (already permission-filtered), `current`.
- Shows the top 4 by `phonePriority`, a centre New button, and More (a vaul sheet) only when more than 4 apps.
- `shellBottomSlot` context: `{ readonly occupant: 'tabs' | 'bulk'; claim(o: 'bulk'): () => void }`, so the bulk bar replaces the tabs while rows are selected.

- [ ] **Step 1: Failing tests:**
  - a 2-app viewer gets 2 tabs + New and no More;
  - an 8-app viewer gets 4 tabs + New + More;
  - labels ≥ 12 px;
  - selecting a table row swaps in the bulk bar, and at most 2 backdrop-filter layers are live.
- [ ] **Step 2: Run red.** **Step 3: Implement.** **Step 4: Run green.**
- [ ] **Step 5: Commit** `feat(shell): phone tab bar with New and More; bulk bar takes its place while selecting`

### Task 17: Look and feel panel; retire the customizer and the layout axes

**Files:**

- Create: `src/lib/layouts/LookAndFeel.svelte` (radio groups from `customizer-config.ts` + a live preview tile)
- Modify: `UserMenu.svelte` (quick palette + dock, and "Look and feel…" opening a milk dialog)
- Delete: `ThemeCustomizer.svelte`, `HorizontalNav.svelte`, `sidebar-sizing.ts`, `NavItem.svelte` (if no other user; grep). The sidebar primitive `ui/sidebar` stays only if something still imports it; otherwise delete it and update `check-component-inventory`.
- Modify: `schema.ts` (remove `layout, navType, contentWidth, sidebar, sidebarColors`), `customizer-config.ts`, `layouts.css` (remove their blocks), `semantic.css` (remove the `data-sidebar-colors` blocks), `check-token-contrast.mjs` (`AXES` drops `sidebarColors`)
- Replace in the same commit:
  - `tests/e2e/customizer.spec.ts` → `look-and-feel.spec.ts`
  - `tests/e2e/shell-layouts.spec.ts` → `shell-positions.spec.ts` (dock bottom/side, auto-hide, scoped-operator dock)
  - `tests/visual/routes/customizer.visual.spec.ts` → `look-and-feel.visual.spec.ts`
  - `nav.visual.spec.ts` → `dock.visual.spec.ts`
  - `tests/unit/layouts/customizer-config.test.ts` → updated
  - `tests/e2e/material-budget.spec.ts`: driving states become bottom dock, side dock, ⌘K open, phone tabs, phone selecting; limits unchanged
  - `shell-corrections.spec.ts` and `role-aware-shell.spec.ts`: assertions on the sidebar move to the dock

- [ ] **Step 1: Failing tests** (the new specs):
  - picking Coral sets `data-palette="coral"` and persists across reload (SSR attribute present on first byte);
  - Side moves the dock;
  - the LeadKart-staff-in-scope dock shows Companies highlighted, and exiting scope restores the normal dock;
  - `PREFERENCE_VALUES` has exactly `palette, mode, dock, autoHideDock, density, transparency`.
- [ ] **Step 2: Run red.**
- [ ] **Step 3: Implement** and delete. Coverage check: every assertion of a retired spec maps to a successor assertion; list the mapping in the commit body.
- [ ] **Step 4: Run green:**
  - the new specs and `material-budget.spec.ts` on chromium;
  - `npm run arch:check`, `npm run lint:deps`, `npm run lint:dead`;
  - `npx vitest run --project client --project server`.
- [ ] **Step 5: Commit** `feat(shell): Look and feel panel; retire the customizer sheet, sidebar and Domiex layout axes (specs replaced one-for-one)`

### Task 18: AppShell assembly

**Files:**

- Modify: `src/lib/layouts/AppShell.svelte` (desk container + wallpaper + Topbar + Dock/TabBar + content band; `children` and `banner` unchanged), `src/styles/theme/layouts.css` (content band offsets from `--shell-*`)
- Test: `tests/e2e/shell-reflow.spec.ts`; `tests/a11y/routes.spec.ts` (both dock positions)

- [ ] **Step 1: Failing tests:**
  - at 360, 768, 1093×614 and 1280×720 zoom 2 there is no horizontal scroll on `/dashboard`, `/settings/users` and `/operator/tenants`;
  - main content's bottom edge is above the dock's top edge (bottom dock), and its start edge is after the rail's end edge (side dock);
  - axe is clean on all routes with `data-dock=bottom` and with `side`.
- [ ] **Step 2: Run red.** **Step 3: Implement.**
- [ ] **Step 4: Run green**, and confirm `git diff --stat src/routes/(app)/+layout.svelte` is empty.
- [ ] **Step 5: Commit** `feat(shell): AppShell on the desk: glass bar, dock or tab bar, content band`

## Stage 4: Checkpoint

### Task 19: Full verification, CLAUDE.md, push request

**Files:**

- Modify: `CLAUDE.md`: "Visual canon" and "Design implementation discipline" sections, per spec §9. Pebble World v8 + the spec are the source of truth; Domiex is structure only. Remove the GlassSurface/Svelte Bits rows. Fold in the pending `.superpowers/sdd/CLAUDE.md.draft` only where it doesn't conflict, and list the conflicts for the owner.
- Modify: `.superpowers/sdd/progress.md` (ledger)

- [ ] **Step 1:** Run every gate once:
  - `npm run lint`, `npm run lint:css`, `npm run lint:deps`, `npm run check`, `npm run arch:check`;
  - `npm run test:coverage`;
  - `npm run test:e2e` (all three browsers);
  - `npm run test:a11y`, `npm run test:perf`;
  - `NODE_ENV=production` build, then `npm run size` and `npm run size:critical`.

  Expected: all green; CSS ≤ 60 KB gz.

- [ ] **Step 2:** Final Opus whole-branch review against the spec.
- [ ] **Step 3: Commit** `docs: CLAUDE.md visual canon is Pebble World`
- [ ] **Step 4:** Ask the owner for an explicit push OK covering the earlier pending pushes. On OK:
  - push;
  - push a commit whose **subject** carries `[regen-visuals]` so CI regenerates every baseline;
  - review the bot's images by eye;
  - push one non-empty follow-up so CI compares against them;
  - watch CI green.

After this plan, per the owner, the next work is the deferred list: Home per role, the world view, page data, the Go endpoints (orders list, home summary, preference sync) and route renames (`/dashboard` → `/home`, touching the hash-pinned root redirect with a deliberate review). Then the pages, one by one, starting with auth.
