# Pebble World: the LeadKart theme, built for real

Date: 2026-11-25 · Status: draft for owner approval · Repo: `leadkart-web` (branch `feat/ui-foundation`) with small Go follow-ups in `leadkart-go`

## 1. What and why

LeadKart becomes an operating system for a pharma PCD company. Every module is an **app** with an icon and a name. The apps live in one **dock** that looks the same on every screen. **Home** is different for every role and shows only what that role may see.

The owner chose this theme on 2026-11-25 after five full theme demos. The visual reference is **Pebble World v8**: `.superpowers/brainstorm/8719-1795528735/content/universe-themes-v8.html`, tab 08. Its look and feel are approved as they are ("Look and feel is all good for the components, no need to change them").

The theme is three materials, each with one job:

- **Glass floats.** Only the shell uses it: the top bar, the dock and one overlay at a time.
- **Clay sits.** Your work sits on it: cards, tiles, app icons ("pebbles"), buttons and stage stones.
- **Troughs sink.** Everything you fill in: fields, tracks, search.

**Why now:** Phase 2 (the UI foundation) is finished and pushed. The pages (auth, identity, then leads, orders and stock) are about to be rebuilt. Doing the theme first means each page is built once, in its final look.

### Goals

1. The shell matches the reference:
   - a glass top bar: logo, "Home › App" breadcrumb, search, New, bell, you;
   - one dock at the bottom or the side, chosen by the user;
   - on a phone, a tab bar.
2. The four logo palettes (Iris default, Ocean, Coral, Emerald), each in light and dark, chosen by the user.
3. Every existing UI primitive is re-skinned into glass, clay and trough, and keeps its behaviour and accessibility.
4. Home per role, built from permission-gated widgets. A "world" (the isometric campus) is an optional Home view for the roles that run the whole place.
5. Every screen works from a 360 px phone to 1920 px, including 1366×768 at 125% (1093×614 CSS px) and 200% zoom. Nothing is hard-coded: everything comes from tokens, clamp() and container queries.
6. Every existing quality gate stays at least as strict, and covers the new theme: contrast, axe, visual regression, blur budget, size budget, arch gates.

### Non-goals

- Rebuilding the leads, orders and stock pages. That is web Phase 1c, Tasks 16–26, done later on this foundation. They get the new shell and tokens only.
- New backend features beyond the small Home data endpoint (§9).
- Hindi. The app stays English only.
- A native mobile app. The phone version is the PWA.

### Anti-goals (a failure even if it works)

- **Gimmicks.** Bouncing, glowing, decorative props, animation that loops on work screens. It must feel like a professional OS.
- **A dock that changes shape by itself.** Only the user's setting moves it, or the device class (a phone gets a tab bar).
- **App colours used as status or as buttons.** Status colours carry meaning; app colours only name an app.
- **A tease.** A widget, app, number or world layer a role may not see is simply not rendered. No locks, no greyed tiles.
- **Text on thin glass.**
- **Building outside the token system.** No hex/oklch at call sites, and no porting the mock's minified CSS as-is.

## 2. Constraints

- **CLAUDE.md is load-bearing:**
  - bits-ui primitives, cva variants, `cn()`;
  - lucide icons through `$icons`;
  - Svelte 5 runes, factory stores, no classes;
  - Gateway → Service → ViewModel → Component;
  - tokens only, logical CSS, `focus-visible`;
  - the Rule of Three.
- **Arch gates stay as strict as they are:** `npm run arch:check` (23 checks), stylelint, dependency-cruiser rules, LOC budgets, `check-raw-elements` (its allowlist may only shrink).
- **Size budgets:** CSS ≤ 60 KB gzip and critical path ≤ 120 KB. The world's art is lazy-loaded and counts toward neither.
- **Blur budget** (`tests/e2e/material-budget.spec.ts`): at most 3 live backdrop-filter layers over moving content on desktop, 2 on coarse pointers, 4 in any state. Glass bar + glass dock + one overlay = 3, which fits.
- **Fonts:** the system font stack chosen in Phase 2 Task 31; the mock uses the same. Tabular figures and Indian number grouping everywhere.
- **Files that must not change:**
  - `src/routes/(app)/+layout.svelte` stays byte-for-byte. The new shell keeps the `AppShell` props and snippet interface it uses. If that turns out impossible, stop and ask.
  - Hash-pinned server files are not touched.
- **Brand-test fixtures (owner approval needed — see §11):** `tests/e2e/fixtures/tokens-light-leadkart.json` and the 159 visual baselines must change, because the colours change on purpose.
  - The token fixture is re-recorded with `LK_RECORD_TOKENS=1` and renamed `tokens-light-iris.json`.
  - The baselines are regenerated only by CI (`[regen-visuals]` in a commit subject), and only as part of an owner-approved push.
  - Neither is ever edited by hand or regenerated to turn a red test green.

## 3. Approaches considered

|     | Approach                                                                                                                                                                                                                                        | Trade-off                                                                                                                                                                                               | Verdict    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| A   | **Evolve the Phase 2 foundation in place.** New palette values, new material tokens (clay, trough, milk, sheet), a new preferences schema (v2), a new shell (Topbar + Dock), and the existing primitives re-skinned through their cva variants. | Keeps everything already proven: the three token layers, SSR preferences, material fallbacks, contrast gate, DataTable, forms. The cost is updating the palette enum everywhere it is wired, in one go. | **Chosen** |
| B   | A second theme beside the current Domiex one, selectable.                                                                                                                                                                                       | Twice the shells, gates and baselines to maintain forever. The owner rejected colour-swap theme sets, and one product should have one design language.                                                  | Rejected   |
| C   | Port the mock's CSS and markup straight in.                                                                                                                                                                                                     | Fastest to a first screen. But it bypasses tokens, Tailwind, bits-ui and every arch gate; it is a demo, not a component system.                                                                         | Rejected   |

The owner handed over the "how" ("like how a FAANG org would design this"), so the choice of A is the controller's call.

## 4. Design tokens

There are three layers, as in Phase 2. The flat rules that the contrast gate parses stay flat.

### 4.1 Reference layer (`src/styles/theme/palettes.css`)

- **Four brand ramps,** `--palette-{iris,ocean,coral,emerald}-50..950`, in oklch, generated from the logo hexes in the reference (`themes/world/10-core.css`):

  | Palette | Logo fill | Button step | Brand as text | Ink on soft |
  | ------- | --------- | ----------- | ------------- | ----------- |
  | iris    | #6c5ce7   | #6252e0     | #5646d4       | #2c2380     |
  | ocean   | #2f6fe0   | #2a66d4     | #2259c2       | #123c86     |
  | coral   | #ec5a36   | #cc4420     | #b63a18       | #7d2a12     |
  | emerald | #12996b   | #0d7f58     | #0b6e4c       | #0c5239     |

- **Four "second piece" ramps** (the logo's K): iris→cyan #10b3c7, ocean→green #16b386, coral→amber #f2a00a, emerald→gold #e8a20c.
- **Removed:** the old ramps (`leadkart, green, violet, orange, teal, fuchsia, lime, amber`, `capsule`), the sidebar swatches, and the extra dark-neutral families (`zinc/stone/neutral/gray`). One neutral family stays.
- **Unchanged:** the status ramps (success, warning, danger, info, gray).
- **App identity colours** become reference tokens, `--app-{home,leads,orders,stock,dispatch,payments,reports,team,settings,companies,people}`. Values come from the reference (leads #d9661c, orders #3b78e0, stock #1c956c, dispatch #a36c38, payments #8559e0, reports #148da6, team #cf4f80, settings #6f7788; home = brand). Operator apps get their own from the same family; designing those is the builder's call (§10).
  - Each must carry a white glyph at 3:1 or better. The UX evaluation found dispatch at 2.36:1, so the builder darkens it until the gate passes.

### 4.2 Semantic layer (`theme/semantic.css`)

- **Kept:** the shadcn names and the Phase 2 extensions (`--primary`, `--primary-text`, `--primary-indicator`, `-hover`, `-soft`, status `-indicator/-border/-soft`, `--subtle-foreground`). Components keep reading these.
- **`:root[data-palette=…]`** replaces `data-colors`. It re-points `--primary-*` and the new `--brand-2-*`.
- **New roles:**
  - `--primary-tonal` and `--primary-tonal-foreground`: the "New" button inside an app.
  - `--app-accent`: set by `.app-<key>` scopes.
  - `--field-border` at 3:1 or better against both sheet and tray (UX eval #6).
  - `--meter-track`.
  - `--focus-ring`.
- **Status vs identity:** status tokens are fixed across palettes and never aliased to an app colour. A count badge is `--neutral-*` unless the item is overdue or at risk (then `--danger-*`).
- **Dark mode:** `light-dark()` plus `color-scheme` from `data-mode`. Values for `light`, `dark` and `auto` are designed in Stage 1. The reference has no dark desk, so the builder designs it, keeps the same material logic on dark neutrals, and shows the owner screenshots at the Stage 1 checkpoint.
- **Dropped:** `black-white` mode. Forced-colours and `prefers-contrast` already have designed answers, and the grayscale filter fights the semantic status colours. (Controller's call; the owner can veto at approval.)

### 4.3 Material layer (`theme/materials.css`, `materials-fallbacks.css`)

The existing glass recipes (bar, pane, sidebar, scrim) stay. The new materials join them:

| Material  | Used for                                         | Recipe (from the reference)                                                                |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `glass`   | top bar, dock, ⌘K / notifications / New overlays | the existing `material-bar` (white about 70%, blur 18, saturate 150%) + rim + float shadow |
| `milk`    | popovers, menus, dialogs, sheets                 | white about 95%, no blur (the existing `material-pane` moves to milk to save blur budget)  |
| `sheet`   | the app's working surface, tables, forms         | solid surface, hairline, a soft drop shadow                                                |
| `clay`    | cards, widgets, tiles                            | solid surface + `--shadow-clay` (outer drop, top light, belly shade)                       |
| `clay-sm` | secondary buttons, chips, segment thumbs         | `--shadow-clay-sm`                                                                         |
| `pebble`  | app icons, avatars, the brand tile               | app colour + `--shadow-pebble` (squircle)                                                  |
| `tray`    | grouped areas inside a sheet                     | `--tray` + inset hairline                                                                  |
| `trough`  | inputs, search, switch tracks, meter tracks      | `--trough` + `--shadow-inset` + a `--field-border` ring                                    |

Clay is drawn with shadows, and forced colours erase shadows. So every clay and trough element gets a transparent 1 px border, and forced colours draw it (as the reference does with `--bd`). The material fallbacks cover clay too: under `data-transparency=off`, `prefers-reduced-transparency` and `prefers-contrast: more`, glass becomes solid, and clay keeps its shape while borders become visible.

### 4.4 Shape, space, type, motion

- **Radius (concentric):**
  - shell capsules: pill
  - sheet: 24
  - clay card: 20
  - control: pill or 14
  - pebble: squircle at about 28% of size
  - These are tokens `--radius-{sheet,card,control,pebble}`, each a clamp() where the reference uses one.
- **Spacing:** the existing 4 px scale plus fluid `--space-fluid-*`. Shell geometry tokens (`--world-pad/gut/bar/rail`, the dock sizes) become `--shell-*` tokens in `theme/layouts.css`, using clamp() with `cqw`/`cqh` against a `desk` size container, as in the reference.
- **Type:** the existing fluid scale. Floor of 12 px for anything a person reads; secondary lines 13 px.
- **Motion:**
  - a press squish: scale .96 over `--duration-fast`;
  - hover lift: 2 px;
  - app-switch cross-fade: 150 ms;
  - nothing loops on work screens.
  - The world's vans are static unless the effects setting is "full" and the screen is Home.
  - `prefers-reduced-motion` removes all of it.

## 5. Preferences (schema v2)

`features/preferences/schema.ts` becomes:

| Axis         | Attribute            | Values (default first)      |
| ------------ | -------------------- | --------------------------- |
| palette      | `data-palette`       | iris, ocean, coral, emerald |
| mode         | `data-mode`          | light, dark, auto           |
| dock         | `data-dock`          | bottom, side                |
| autoHideDock | `data-dock-autohide` | off, on                     |
| density      | `data-density`       | comfortable, compact        |
| transparency | `data-transparency`  | glass, reduced, off         |
| homeView     | `data-home-view`     | world, widgets              |

- **Removed:** `layout`, `navType`, `contentWidth`, `sidebar`, `sidebarColors`, `darkPalette`. The OS shell has one structure; the dock position is its one layout choice.
- **Cookie:**
  - Still the `lk_ui` cookie, SSR-applied through `html-shell.ts`, so the first paint already has the right theme.
  - The codec moves to `v:2`.
  - A `v:1` cookie decodes to the defaults. The app is pre-launch, so there is no migration shim.
  - The decoder ignores `v` today, so add an explicit check: anything but `v === 2` gives the defaults, with a unit test.
- **Default `homeView`:** `world` when the viewer's Home has a world layer (§7), otherwise the axis is ignored.
- **Customizer:** the right-side `ThemeCustomizer` sheet becomes **Settings › Look and feel**, a page section in the Settings app with the same radio groups, plus the quick palette and dock controls in the user menu. `CustomizerTile` stays the only reader of reference ramps; its swatch becomes the logo tile in that palette.
- **Later:** per-user preferences synced through Go, so a person's look follows them across devices. That is a Go follow-up (§9), not this project.

## 6. Shell

### 6.1 Structure

`AppShell` keeps its props and snippets. Inside it:

`[data-shell=root]` (a `desk` size container, wallpaper from `--wall-*`) holds:

- **`Topbar`**: a glass capsule, floating, inset by `--shell-pad`.
- **`Dock`**: glass, bottom or side.
- **`[data-shell=content]`**: banners, then `main#main-content`, then the page. Positioned between the bar's band and the dock's band. Nothing ever sits under the dock.

### 6.2 Topbar (left to right)

1. **Brand tile:** the logo pebble.
2. **Breadcrumb pill:** "Home › App". "Home" is the way back. On Home it reads "Home · Company name".
3. **Search trough:** opens the existing CommandPalette with Ctrl/⌘K. It searches records and actions through `/api/v1/search`.
4. **New:**
   - Filled brand on Home and on any screen with no main action of its own.
   - Tonal brand inside an app, so it never competes with the app's own primary.
   - Its menu lists only the creates the viewer is allowed.
5. **Bell:** the notifications popover, from `/api/v1/notifications` and `unread-count`. This is new work: a `features/notifications` gateway, service and popover. Go already has the endpoints (list, read, read-all, dismiss, unread-count).
6. **User pill:** avatar, name and role. The menu holds account, palette, dock and sign out.

Below 1000 px container width the bar gives up words before anything wraps: crumb text goes first, then the search placeholder.

### 6.3 Dock — the OS rule

- **One shape on every screen.** Opening an app moves the highlight and nothing else, like the macOS Dock, the iOS tab bar or the Windows taskbar. There is no compact state inside apps. This is the owner's explicit ruling of 2026-11-25.
- **Contents:**
  - Every app the viewer may open, each as a pebble icon with its name under it.
  - A divider before Settings.
  - A neutral count badge; a red badge only for overdue or at-risk items.
  - The accessible name includes the count ("Orders, 7 to pack").
  - The current app is `aria-current="page"`.
- **Position** comes from the `dock` preference:
  - **bottom** (default): centred, keeping a band of `--shell-dock-band`.
  - **side:** a slim named rail of `--shell-rail` width on the left. Content moves right by the rail.
  - The two positions are one component and one set of tokens swapped by `data-dock`, as in the reference `20-shell.css`.
- **Auto-hide** (the `autoHideDock` preference, off by default; the macOS model):
  - When on, the bottom dock tucks under the edge and comes back on pointer-at-edge, Tab focus or its handle.
  - Very short screens (container height under about 560 px: a phone on its side, heavy zoom) auto-hide regardless, because the dock band would take the working area. This follows device size, never which app is open.
- **Too many apps for the width:** the dock scrolls inside itself (no wrap) and keeps names visible. At phone width the tab bar takes over.
- **Keyboard:**
  - Roving tabindex inside the dock (arrow keys), so the dock is one Tab stop.
  - `g` then a letter switches app.
  - `?` opens a new shortcut sheet (a milk dialog listing the app chords and ⌘K). Neither exists yet; both are new work in Stage 2.

### 6.4 Phone (≤ 640 px container width, or coarse pointer and ≤ 760 px)

The dock becomes a **tab bar**:

- the 4 apps this role uses most, with labels of 12 px or more;
- a large centre **+** (New);
- **More**, opening a sheet with the rest.

The rest of the phone shell:

- Which 4 apps appear comes from per-app `phonePriority` in the app catalogue, filtered by permission. A rep gets Home, Leads, Orders and Payments when those exist.
- The top bar becomes title + search + bell.
- Safe areas come from `env(safe-area-inset-*)`.
- vaul-svelte for bottom sheets.
- **Selection:** while rows are selected, the bulk-action bar replaces the tab bar in the same band, as the iOS selection toolbar does. A phone therefore never has more than two glass layers: the top bar and one bottom bar.

### 6.5 The app catalogue (single source of truth)

`src/lib/config/nav.ts` becomes the **app catalogue**. Each app has:

- `key`, name, lucide icon;
- `accent` token;
- `routes` (its route keys and sub-views);
- `access` (any-of permissions);
- `context` (own / scope / both);
- `phonePriority`;
- `count` (an optional query for the badge).

The same table still drives the server route guards (`routeForPath`). Sub-views of an app (for example Team › People, Roles, Hierarchy, Requests) render as that app's section nav inside the page, not in the dock.

| App                         | Today's routes                                                                                                  | Who sees it (existing permission keys)                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Home                        | `/dashboard` → renamed `/home`                                                                                  | everyone                                              |
| Leads                       | `/leads`                                                                                                        | `crmLeadsRead`                                        |
| Orders                      | `/orders`, quotations                                                                                           | `ordersOrdersRead` / `ordersQuotationsRead`           |
| Stock                       | `/inventory`                                                                                                    | `inventoryCatalogRead`                                |
| Team                        | `/settings/users`, `/settings/roles`, hierarchy; plus a "Requests to approve" view of `/permission-requests`    | identity users/roles view                             |
| Settings                    | `/settings/account/*`, `/settings/tenant/*`, Look and feel, and **My access requests** (`/permission-requests`) | everyone (account, requests); tenant admins (company) |
| Companies (LeadKart staff)  | `/operator/tenants`, `/operator/scope/*`                                                                        | platform tenants view                                 |
| People (LeadKart staff)     | `/operator/persons`                                                                                             | platform users view                                   |
| Dispatch, Payments, Reports | none yet                                                                                                        | appear when their pages exist                         |

**The dock only lists apps that both exist and the viewer may open.**

**Permission requests** stay one route with one access rule (any signed-in member, own context). Settings is the home for a member's own requests, because everyone has Settings. Team links to the same route, filtered to the requests waiting for the viewer's approval. That link shows only for viewers who can approve.

**LeadKart staff inside a company** (the `lk_op_tenant` scope cookie is set):

- The existing context banner stays.
- The dock shows Home (the staff member's own LeadKart Home), Companies (highlighted, with the scoped company's profile, members, roles, activity and settings as its section nav), and Leads, Orders and Stock, which are `context: 'both'` and act on the scoped company.
- Team and Settings are own-context, so they are not in the dock while scoped; their scoped equivalents live in Companies.
- The breadcrumb reads "Home › Companies › {company name}".
- Leaving the company (`DELETE /api/operator/scope`) returns the normal dock.
- The catalogue's existing `context` field (own / scope / both) already expresses all of this; no new model is needed.

**Route paths** stay as they are except `/dashboard` → `/home`, which is pre-launch, so there is no redirect shim. `/dashboard` is hard-coded in several places, which all change in one commit with their tests:

- `src/routes/+page.server.ts:14`. This file is hash-pinned (`UNGUARDED_REVIEWED`), so the change takes a deliberate review and a re-hash, with owner approval (§11).
- `lib/server/redirect.ts`
- `NAV_ROUTES.dashboard` / `guards.ts`
- `settings/account/profile/+page.server.ts`
- `must-change-password/+page.server.ts`
- the route-guard tests
- the manifest `start_url`

Renaming `/inventory` to `/stock` is the builder's call: if done, do it in one commit with its tests.

### 6.6 Inside an app

- **Layout:** one sheet holding up to three panes: views (section nav), list, detail.
- **Container-query step-downs** on the sheet:
  - 3 panes at ≥ 1100 px;
  - 2 at ≥ 760 px (section nav becomes a segmented control or popover);
  - 1 below that (detail opens as a sheet with a back control);
  - the phone shell below 640 px.
- Names and amounts never drop out of a list row; nothing scrolls sideways.
- The main action sits in a **reserved footer** of its pane, never floating over the list.
- `PageHeader` keeps the single `<h1>`.
- **Density:** `compact` tightens table rows and paddings through tokens. DataTable's own `density` prop defaults from the preference.

## 7. Home per role

- **Widget registry:** `features/home/widgets.ts`. Each widget declares:
  - `key`;
  - `requires`: the permissions;
  - its data query (through the feature gateway);
  - its grid span on a 12-column grid that reflows by container query;
  - one stated time frame ("open now", "today", "this month").
- **Rendering:** Home renders the widgets whose `requires` pass. The server enforces data scope; the UI only omits. "Role" means the set of widgets that pass, not a role name, so a custom role gets a sensible Home with no new code.
- **First widgets** (each has a Go source today):
  - **Today:** an action queue from `/api/v1/tasks/work-items` (rows) and `/api/v1/tasks/work-items/dashboard` (counts). Each row deep-links into its app.
  - **Requests to approve:** from `/api/v1/permission-requests`.
  - **Leads to call:** from `/api/v1/crm/reminders`.
  - **Quotations waiting:** from `/api/v1/orders/quotations`.
  - **Stock expiring:** from `/api/v1/inventory/products?expiring_within_days=`. Go has no batch list across products.
  - **For LeadKart staff:** the platform stats widget (`/api/v1/platform/stats`).
- **Orders by stage** waits for an orders list endpoint in Go (§9). Go today has no orders list, only `/orders/orders/{id}*`, and the web gateway's `/v1/orders` call is one of the paths pinned as Go-missing. Until that endpoint exists, the widget is not built, and the Orders dock badge shows no count.
- **The world** is a Home view, not a widget:
  - The isometric campus from the reference: one building per app, its roof in that app's colour, a queue count, late or stuck markers, and vans for real consignments in transit.
  - It is shown only to viewers who can see at least three places. A place renders only if its app is visible to the viewer.
  - It is one inline SVG component, lazy-loaded, with buildings as data and the layout from the reference `15-world.css` and `world.mjs`. Every place is a real link or button with an accessible name. A text equivalent (the place list with counts) is always available, and is what a screen reader gets.
  - The `homeView` preference switches between World and Widgets-only; Widgets-only is always available. The owner ruled there is no territory map.
- **Arrange** (moving and hiding widgets) is out of scope until per-user preferences sync through Go. Layouts are fixed per widget set until then.

## 8. Components

Every primitive keeps its API and behaviour; only the skin changes, through its cva variants and the new tokens.

| Group                   | New look (from the reference components tab)                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Button**              | `primary` (brand clay, white text), `tonal` (soft brand, brand ink), `secondary` (white clay), `ghost`, `destructive`, `link`; sizes sm/md/lg; icon-only; loading. One primary per view (lint-free rule, checked in review).                                        |
| **Fields**              | Input, Textarea, Select trigger, Combobox, DatePicker field: trough + `--field-border` + focus ring. Labels above, hint and error below (the existing `field` set).                                                                                                 |
| **Choice controls**     | Checkbox, Radio, Switch (trough track, clay knob), Slider (trough + brand fill), Toggle group / segmented (tray + clay thumb), Tabs (segmented).                                                                                                                    |
| **Status and identity** | Badge / StatusPill: semantic status tints with a word and a glyph. Count badge: neutral, red only for urgent. Avatar: pebble.                                                                                                                                       |
| **Containers**          | Card (clay), StatCard → KPI tile (clay, value + one time frame + comparison), EmptyState (simple icon + caption), Skeleton (tray shimmer, static under reduced motion).                                                                                             |
| **Overlays**            | Dialog, AlertDialog, Sheet, Drawer (vaul), Popover, Dropdown, Tooltip, Command: milk (no blur) with a scrim; ⌘K, notifications and New use the one allowed overlay glass. Toast (sonner): milk pill.                                                                |
| **Auth card**           | The sign-in family has no top bar and no dock, so its card keeps the existing glass (`.lk-auth-card`, GD22) over the palette wallpaper: one glass layer, within budget.                                                                                             |
| **Data**                | DataTable on a sheet (sticky header, compact density, bulk bar = the existing `material-bar`, pagination), Stepper = order stage stones, Progress = fat meter in a trough, Timeline, Kanban.                                                                        |
| **Charts** (LayerChart) | Values or an axis always; the partial period drawn lighter; a "view as table" option.                                                                                                                                                                               |
| **Brand**               | `BrandMark` → the LK monogram "Two Cuts" (`.superpowers/brainstorm/logo-src/lk/`, monogram 6) as a token-driven SVG: L = `--primary`, K = `--brand-2`, both following the palette. `BrandIcon` → the mark on a clay tile. The wordmark asset and its hash pin stay. |
| **Static icons**        | `favicon.svg`, PNG sizes, apple-touch, maskable and manifest icons regenerated from the mark in Iris. `theme_color` in the manifest and `app.html` becomes the Iris token's hex, generated and written by a script so it is never hand-typed.                       |

The `(dev)/styleguide` route becomes the living specimen of every component in all four palettes and both modes, which is what visual tests shoot.

## 9. Data and backend dependencies

Everything in Stages 1–6 uses Go endpoints that exist today, except what is listed here. Gaps, as Go follow-ups (with the owner's push OK, on the Go branch): 0. **Orders list** (`GET /api/v1/orders/orders` with stage filters and totals). This already belongs to the Phase 1c orders re-contract. The Orders dock count and the Orders-by-stage widget wait for it.

1. **Home summary:** `GET /api/v1/home/summary`. One permission-scoped call returning per-app queue counts and the late/stuck flags the dock badges and the world need. Until it exists, badges and the world use the list endpoints' totals, and any count with no source is not shown.
2. **Per-user UI preferences** (sync across devices).
3. **Dues ageing and reports aggregates**, for the Payments and Reports apps later.

## 10. Build stages

Each stage ends green on the full local gate set, gets an Opus review, and ends with screenshots for the owner (light and dark, desktop / 1093×614 / 360). Heavy suites run at stage checkpoints, as usual.

The visual-regression suite is not part of the local stage gate: its baselines are Linux-only and come from CI. While Stages 1–3 change every colour, the visual suite is expected to differ. It is re-baselined at each owner-approved push through `[regen-visuals]`, and the new images are reviewed by eye before the next push. Every other gate (unit, e2e, a11y, contrast, arch, size, blur budget) stays green at every stage.

| Stage                           | Contents                                                                                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Foundation**               | §4 and §5: tokens, palettes, the dark design, materials, preferences v2, contrast gate covering 4 palettes × 3 modes × materials, the token fixture re-recorded, brand mark and static icons. |
| **2. Shell**                    | §6: Topbar, Dock (both positions, auto-hide, tuck), phone tab bar, app catalogue, `/home` route, Look and feel in Settings, the customizer sheet removed.                                     |
| **3. Components**               | §8: every primitive re-skinned; styleguide updated; component tests updated.                                                                                                                  |
| **4. Auth pages**               | Sign-in, forgot, reset, confirm-email-change on the new look. These are the owner's first pages.                                                                                              |
| **5. Identity and admin pages** | Settings (account, company), Team (users, roles, hierarchy, requests), LeadKart-staff Companies and People.                                                                                   |
| **6. Home**                     | Widget registry, the first widgets, platform Home, then the world view.                                                                                                                       |
| **7. Phone PWA polish**         | Platform-aware install sheet (iOS steps vs `beforeinstallprompt`), offline banner styling, safe areas, and manifest screenshots.                                                              |

Leads, Orders and Stock pages are rebuilt after this, in Phase 1c Tasks 16–26, on these components.

**Left to the builder:**

- exact oklch ramp steps (they must hit the reference's button/text/ink steps and pass the gate);
- the dark-mode values;
- the operator app colours;
- squircle technique;
- token names beyond those fixed here;
- test file layout;
- whether `/inventory` becomes `/stock`;
- how the world SVG is factored into components.

## 11. Quality gates

| Gate                                           | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contrast gate** (`check-token-contrast.mjs`) | Now covers 4 palettes × light/dark/auto, plus the new materials composited over the worst wallpaper, field borders and meters at 3:1 or better, white on every app pebble at 3:1 or better, and tonal-button ink at 4.5:1 or better.                                                                                                                                                                                                                                        |
| **Visual**                                     | All 159 baselines change. The matrix spec follows the new axes (palettes, modes, dock, density, transparency, home view). New shots: dock bottom vs side, phone tab bar, 1093×614, 200% zoom at 1280×720. Baselines come from CI only, through an owner-approved push.                                                                                                                                                                                                      |
| **a11y**                                       | axe on every route in both dock positions. A keyboard e2e: dock roving focus, `g`-chords, nothing focused hidden under the dock (WCAG 2.4.11).                                                                                                                                                                                                                                                                                                                              |
| **Reflow**                                     | Playwright at 360, 768, 1093×614 and 1280×720 at 200%. No horizontal scroll; list names and amounts visible.                                                                                                                                                                                                                                                                                                                                                                |
| **Blur budget**                                | The limits in `material-budget.spec.ts` stay exactly as they are: 3 layers over moving content on desktop, 2 on a coarse pointer, 4 in any state. The states it drives change, because the horizontal layout, the customizer sheet and the sidebar are gone. They become: Home with a bottom dock, Home with a side dock, an app with ⌘K open, a phone with the tab bar, and a phone with rows selected (bulk bar in the tab bar's place). The auth-card glass check stays. |
| **Retired tests**                              | `customizer.spec.ts`, `shell-layouts.spec.ts`, and the visual `customizer` and `nav` suites test removed axes and the old sidebar. Each is replaced in the same commit by a spec for its successor: Look and feel, dock positions, auto-hide, the phone tab bar, the scoped-operator dock. Coverage never drops. The replacements are listed in the Stage 2 review.                                                                                                         |
| **Size**                                       | CSS ≤ 60 KB gz; the world chunk is lazy and measured separately (≤ 40 KB gz, the controller's call).                                                                                                                                                                                                                                                                                                                                                                        |
| **Brand tests**                                | `brand.test.ts` and `brand-palette.test.ts` are rewritten for the new mark and the 4 palettes. This is a deliberate rewrite, reviewed, not a loosening.                                                                                                                                                                                                                                                                                                                     |
| **CLAUDE.md**                                  | The "Visual canon" and "Design implementation discipline" sections are rewritten. Pebble World v8 plus this spec replace Domiex as the visual source of truth; Domiex stays a structure reference only. The stale GlassSurface / Svelte Bits rows go.                                                                                                                                                                                                                       |

**Owner approvals this doc asks for** (they change protected files):

1. Re-recording the token fixture (renamed to `tokens-light-iris.json`).
2. Regenerating all visual baselines through CI at the first approved push after Stage 3.
3. Retiring the Domiex layout options (layout, nav type, content width, sidebar size, sidebar colours, dark palette) and the black-white mode, in favour of the OS shell's dock setting.
4. Committing the reference page (`node build.mjs --only=world`, about 520 KB) to `docs/design/pebble-world/reference.html`, so the visual spec is in the repo and not only in the gitignored brainstorm folder.
5. Re-hashing `src/routes/+page.server.ts` after its one-line `/dashboard` → `/home` change, with a deliberate review.
6. Rewriting the protected shell specs for the new shell: the blur-budget spec's driving states (limits unchanged) and the retired customizer, layout and nav specs, each replaced in the same commit.
