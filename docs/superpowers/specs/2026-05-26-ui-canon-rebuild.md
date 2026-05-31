# UI Canon Rebuild — design system + rich components + intensive testing

**Branch**: `feat/ui-canon-rebuild`
**Started**: 2026-05-26
**Owner**: solo dev + AI pair

## Why this exists

Wave-2 of the architecture-tests pass shipped strict static-analysis gates
but left the rendered UI without proper visual + structural guardrails.
Symptoms that surfaced in dev shortly after merge:

- Form submit-button alignment inconsistent between `<ChangeEmailForm>`
  (full-container width) and `<ChangePasswordForm>` (right-aligned)
- Tenants table ships no sort, no filter, no URL state (only `<OrdersList>`
  does)
- DataTable header text-size + cell-content vertical-align diverge
- Super-user nav (`PLATFORM_NAV`) missing Person Directory + Permission
  Requests; operator scope nav missing CRM modules of the tenant being
  viewed
- 230+ Svelte components, ~5 Storybook stories total, zero committed
  visual snapshots → every component is unverified at the pixel level

The static-analysis gates can't catch any of these. We need
component-level + route-level visual + structural tests.

## Session sequence (single feature branch, sequential commits)

Each row = one focused commit boundary. Each commit ends with green CI +
the 14 arch gates + visual snapshots committed + Storybook stories +
docs updated. No commit moves on with corner-cutting.

| #     | Session                       | Lands                                                                                                                                                                                                                                                                                       |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** | **UI/UX testing at scale**    | Visual regression infra (Playwright + Storybook test-runner), strict snapshot baselines for every route × viewport, story snapshots for every primitive × variant × state, a11y deep tests on every route, layout-inconsistency arch gates, design-token strictness, CI artifact visibility |
| 1     | Remove email-change + cleanup | Email-change flow deleted end-to-end (form, route, BFF handler, locales, auth API); test-suite baselines re-snapped                                                                                                                                                                         |
| 2     | DataTable v2 — FAANG depth    | Multi-sort, column visibility, density modes, sticky header, quick search, column pinning, column resize, URL state, keyboard nav, export CSV; all existing tables migrate                                                                                                                  |
| 3     | Forms canon                   | `FormShell` primitive, sync + async validation, auto-save indicator, dirty detection, unsaved-changes prompt, multi-step wizard, repeating arrays; every form migrates; submit-button canon arch gate                                                                                       |
| 4     | Dashboard Cards + Graphs      | StatCard with trend/comparison/sparkline, KPI grid; Chart.js 4 integration (themed); line/bar/area/pie/donut + time-series zoom                                                                                                                                                             |
| 5     | DataGrid — bulk-edit grade    | Inline cell editing, copy/paste range, undo/redo, frozen rows/columns, master/detail, edit conflict detection                                                                                                                                                                               |
| 6     | Nav redesign                  | Expandable sidebar groups, operator-scope tenant-context nav, keyboard shortcut hints, Cmd-K tie-in, `PLATFORM_NAV` gaps closed                                                                                                                                                             |

## Session 0 — testing infrastructure (current commit boundary)

### Layer A — visual regression for routes

- Playwright `toHaveScreenshot` configured with strict stability:
  - `maxDiffPixelRatio: 0.001` (0.1%)
  - `threshold: 0.1` per pixel
  - Animations + transitions overridden to 0ms via injected stylesheet
  - Caret blink disabled
  - Font rendering pinned (system stack with consistent fallback chain)
  - Web fonts: `await page.evaluate(() => document.fonts.ready)` before snap
  - Viewport pinned per test
- Playwright `storageState` for auth — `globalSetup` does mocked login
  once, saves `playwright/.auth/{tier}.json`, every visual test reuses
  the state. No per-test login overhead.
- Three viewports per route: desktop (1280×800), tablet (768×1024),
  mobile (375×812)
- Route surfaces snapshotted:
  - Auth: `/signin`, `/forgot-password`, `/reset-password?token=*`,
    `/verify-email?token=*`, `/must-change-password`
  - Platform: `/dashboard`, `/operator/tenants`, `/operator/persons`,
    `/operator/persons/[id]`
  - Operator scope: `/operator/scope/profile`, `/operator/scope/members`,
    `/operator/scope/roles`, `/operator/scope/activity`,
    `/operator/scope/settings`
  - Settings: `/settings/account/{profile,security,sessions,activity}`,
    `/settings/tenant/{profile,statutory,contact,preferences}`,
    `/settings/users`, `/settings/roles`, `/settings/roles/[id]`
  - CRM: `/leads`, `/leads/[id]`, `/orders`, `/orders/[id]`, `/inventory`,
    `/inventory/[id]`
  - Permissions: `/permission-requests`, `/permission-requests/[id]`
  - Errors: `/404`, `/500`
- Baselines committed under `tests/visual/__screenshots__/{spec-file}/`

### Layer B — visual regression for components

- `@storybook/test-runner` wired
- Story coverage requirements per primitive:
  - Button: 5 variants × 4 sizes × {default, hover, focus, loading,
    disabled} states ≈ 100 stories
  - Badge: 6 variants × 3 appearances × 2 sizes = 36
  - Alert: 4 variants × {default, title, dismissible} = 12
  - TextField: {idle, error, hint, disabled, focused, with-prefix-icon} = 6
  - Card.Root + Card.Header + Card.Body + Card.Footer composition
  - DataTable: 4 states × 2 density × 2 variants
  - Skeleton: 3 shapes
  - Toaster: 4 variants × {with-action, without-action} = 8
  - …continued for every primitive in the inventory
- Test-runner integrated into CI as a separate parallel job

### Layer C — accessibility deep tests

- axe-core on EVERY route (not just smoke set)
- `@storybook/addon-a11y` enabled per story
- Strict mode: error on serious + moderate violations (was: serious +
  critical)
- Keyboard navigation tests:
  - Tab order verification (per route, expected sequence)
  - Skip-link reachability + activation
  - Focus trap in Dialog/Drawer/Menu (Escape dismissal)
  - Roving tabindex in DataTable + Kanban + Tabs
- Screen-reader landmark assertions: every route has exactly one
  `<main>`, one `<header>`, named regions

### Layer D — layout-inconsistency arch gates

New `scripts/arch/check-*.mjs` gates:

- `check-form-submit-canon` — every `<form>` ends with a footer matching
  `FormFooter` pattern (until `FormShell` primitive lands in Session 3)
- `check-card-padding-canon` — every `Card.Content` uses padding tokens
- `check-table-cell-align` — every `<td>` carries `align-middle` or
  vertical-align: middle
- `check-no-inline-styles-with-literals` — `style="..."` attrs must use
  CSS custom properties, not literal pixel/colour values

### Layer E — design-token strictness

- Tighten `check-token-contrast` to verify rendered-DOM pairs (not just
  declared token pairs)
- New: `check-token-usage-per-component` — every primitive's
  `<style>` block consumes only `--<component>-*` or `--color-*` tokens
- New: `check-shadow-token` — every `box-shadow` value uses `var(--shadow-*)`
- New: `check-radius-token` — every `border-radius` uses `var(--radius-*)`

### Layer F — CI visibility

- Storybook static build uploaded per PR (`storybook-static/`)
- Playwright HTML diff reports uploaded on visual-test failure
- axe-core JSON violation report uploaded
- PR-comment bot for visual diffs (optional — `argos-ci` free tier OR
  custom GitHub Action)
- 14-day artifact retention

## Operating ground rules

- **One feature branch** (`feat/ui-canon-rebuild`) for all 7 sessions
- **One PR** at the end, OR sequential PRs back-merging into the branch
  if review surface gets unwieldy
- **Each commit is "done done"**: visual baselines, Storybook stories,
  arch-gate added if a canon emerges, CI green, no warnings
- **No corner-cutting**: every primitive ships with story + snapshot +
  a11y assertion + variant coverage

## Status

- **Session 0 — in progress**
- 1-6 — not started
