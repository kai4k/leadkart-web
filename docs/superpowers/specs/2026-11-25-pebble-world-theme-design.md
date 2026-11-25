# Pebble World: the LeadKart design system

Date: 2026-11-25 · Status: draft for owner approval · Repo: `leadkart-web` (branch `feat/ui-foundation`)

## 1. What and why

LeadKart becomes an operating system for a pharma PCD company. Every module is an **app** with an icon and a name. The apps live in one **dock** that looks the same on every screen.

The owner chose the theme on 2026-11-25 after five full theme demos. The visual reference is **Pebble World v8**: `.superpowers/brainstorm/8719-1795528735/content/universe-themes-v8.html`, tab 08. The owner approved the reference's look and feel as they are.

**Scope: the design system, not the pages.** We build it the way a large product org builds one:

1. **Foundations:** tokens, palettes, materials, type, space, motion.
2. **Components:** primitives and generic patterns.
3. **The app shell.**

All of it is documented and tested on a living catalogue page. Pages are then built **one by one** on top, each against its real data and its own design pass. The reference's demo data (Ravi Pharma, the campus, the sample widgets) shows the _language_; it is not a page spec. In the owner's words: "Things will change page by page anyways."

The theme is three materials, each with one job:

- **Glass floats.** Only the shell uses it: the top bar, the dock and one overlay at a time.
- **Clay sits.** Cards, tiles, app icons ("pebbles"), buttons, stage stones.
- **Troughs sink.** Everything you fill: fields, tracks, search.

### Goals

1. **Tokens:** three layers. The four logo palettes (Iris default, Ocean, Coral, Emerald), each in light and dark. Materials, shape, space, type and motion are all tokens.
2. **Components:** every existing primitive re-skinned into glass, clay and trough, keeping its API, behaviour and accessibility. The generic patterns the reference repeats across apps are built as components (§7).
3. **The shell:**
   - a glass top bar;
   - one dock, at the bottom or the side by the user's choice, the same shape on every screen;
   - a phone tab bar;
   - the app catalogue driving all three.
4. **User look settings:** palette, mode, dock position, dock auto-hide, density and transparency, applied server-side on first paint.
5. **Responsive by construction:** every component and the shell work from a 360 px phone to 1920 px, including 1366×768 at 125% (1093×614 CSS px) and 200% zoom. Nothing is hard-coded: tokens, clamp() and container queries throughout.
6. **The catalogue:** `(dev)/styleguide` shows every token, component and pattern in all palettes and modes, and is what the visual tests shoot.
7. **Existing pages keep working and pick up the new skin automatically** through the primitives they already use. They are not redesigned here.

### Non-goals (each comes later, page by page)

- Designing or rebuilding any page: auth, settings, team, companies, Home, leads, orders, stock.
- Home per role, its widgets and data, and the "world" campus view. That is a page.
- Backend work. The design system needs no new Go endpoint.
- Route renames such as `/dashboard` → `/home`. That is page work.
- Hindi. A native app (the phone version is the PWA).

### Anti-goals (a failure even if it works)

- **Gimmicks:** bouncing, glowing, decorative props, looping animation on work screens.
- **A dock that changes shape by itself.** Only the user's setting, or the device class (a phone gets a tab bar), changes it.
- **App colours used as status or as buttons.**
- **A tease:** a component that renders a locked or greyed-out thing the viewer may not use. The pattern is to omit.
- **Text on thin glass.**
- **Building outside the token system:** no hex/oklch at call sites, and no porting the mock's minified CSS.

## 2. Constraints

- **CLAUDE.md is load-bearing:** bits-ui primitives, cva variants, `cn()`, lucide through `$icons`, Svelte 5 runes and factory stores, tokens only, logical CSS, `focus-visible`.
  - **Rule of Three:** a generic pattern becomes a component here only if the reference uses it in three or more places (§7 names them).
- **Arch gates stay at their current strictness:** `npm run arch:check` (23 checks), stylelint, dependency-cruiser, LOC budgets, and `check-raw-elements` (its allowlist may only shrink).
- **Size:** CSS ≤ 60 KB gzip, critical path ≤ 120 KB.
- **Blur budget** (`tests/e2e/material-budget.spec.ts`): at most 3 live backdrop-filter layers over moving content on desktop, 2 on a coarse pointer, 4 in any state. Glass bar + glass dock + one overlay = 3.
- **Fonts:** the system stack chosen in Phase 2 Task 31; the reference uses the same. Tabular figures and Indian number grouping.
- **Files that must not change:**
  - `src/routes/(app)/+layout.svelte` stays byte-for-byte. The shell keeps `AppShell`'s `children` and `banner` interface. If that is impossible, stop and ask.
  - Hash-pinned server files.
- **Protected fixtures** (owner approval, §10): `tests/e2e/fixtures/tokens-light-leadkart.json` and the 159 visual baselines change because the colours change on purpose.
  - The fixture is re-recorded with `LK_RECORD_TOKENS=1` and renamed `tokens-light-iris.json`.
  - Baselines come only from CI (`[regen-visuals]` in a commit subject), at an owner-approved push.
  - Neither is edited by hand, nor regenerated to make a red test green.

## 3. Approaches considered

|     | Approach                                                                                                                                                             | Trade-off                                                                                                                                                                                       | Verdict    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| A   | **Evolve the Phase 2 foundation in place:** new palettes, new material tokens, preferences v2, primitives re-skinned through their cva variants, then the new shell. | Keeps everything proven: three token layers, SSR preferences, material fallbacks, the contrast gate, DataTable, forms. The cost is changing the palette enum everywhere it is wired, in one go. | **Chosen** |
| B   | A second theme beside the Domiex one, selectable.                                                                                                                    | Two shells, gate sets and baseline sets forever. One product, one design language.                                                                                                              | Rejected   |
| C   | Port the mock's CSS and markup.                                                                                                                                      | Fast to a first screen, but bypasses tokens, bits-ui and every gate. A demo, not a system.                                                                                                      | Rejected   |

## 4. Foundations (tokens)

Three layers, as in Phase 2. The flat rules the contrast gate parses stay flat.

### 4.1 Reference layer (`src/styles/theme/palettes.css`)

**Brand ramps.** Four ramps, `--palette-{iris,ocean,coral,emerald}-50..950`, in oklch, generated from the logo hexes in the reference (`themes/world/10-core.css`):

| Palette | Logo fill | Button step | Brand as text | Ink on soft | Second piece (the K) |
| ------- | --------- | ----------- | ------------- | ----------- | -------------------- |
| iris    | #6c5ce7   | #6252e0     | #5646d4       | #2c2380     | #10b3c7              |
| ocean   | #2f6fe0   | #2a66d4     | #2259c2       | #123c86     | #16b386              |
| coral   | #ec5a36   | #cc4420     | #b63a18       | #7d2a12     | #f2a00a              |
| emerald | #12996b   | #0d7f58     | #0b6e4c       | #0c5239     | #e8a20c              |

**Removed:** the old ramps (`leadkart, green, violet, orange, teal, fuchsia, lime, amber, capsule`), the sidebar swatches, and the extra dark-neutral families. One neutral family stays. The status ramps are unchanged.

**App identity colours,** `--app-{home,leads,orders,stock,dispatch,payments,reports,team,settings,companies,people}`:

- From the reference: leads #d9661c, orders #3b78e0, stock #1c956c, dispatch #a36c38, payments #8559e0, reports #148da6, team #cf4f80, settings #6f7788.
- Home = brand.
- Companies and People: the builder picks from the same family.
- Each must carry a white glyph at 3:1 or better. Dispatch measured 2.36:1, so it is darkened until it passes.

### 4.2 Semantic layer (`theme/semantic.css`)

- **Names:** the shadcn names and the Phase 2 extensions stay, so components keep reading them.
- **Palette switch:** `:root[data-palette=…]` replaces `data-colors`. It re-points `--primary-*` and the new `--brand-2-*`.
- **New roles:**
  - `--primary-tonal` and `--primary-tonal-foreground`: the soft brand button.
  - `--app-accent`: set by `.app-<key>` scopes.
  - `--field-border`: 3:1 or better against sheet and tray.
  - `--meter-track`.
  - `--focus-ring`.
  - `--wall-1..3`: the palette-tinted wallpaper.
  - `--badge-count`: neutral.
- **Status colours** are fixed across palettes and never aliased to an app colour. A count is neutral; red means overdue or at risk only.
- **Dark mode:** `light-dark()` plus `color-scheme` from `data-mode` (light, dark, auto).
  - The reference has no dark desk, so the builder designs dark on the same material logic.
  - The owner sees dark screenshots at the Stage 1 checkpoint, before anything else builds on it.
- **Dropped:** `black-white` mode. Forced colours and `prefers-contrast` already have designed answers, and grayscale fights the status colours.

### 4.3 Material layer (`theme/materials.css`, `materials-fallbacks.css`)

| Material  | Used for                                                    | Recipe (from the reference)                                                              |
| --------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `glass`   | top bar, dock, ⌘K / notifications / New overlays, auth card | the existing `material-bar` (white ~70%, blur 18, saturate 150%) + rim + float shadow    |
| `milk`    | popovers, menus, dialogs, sheets, toasts                    | white ~95%, no blur. The existing `material-pane` becomes milk, to save the blur budget. |
| `sheet`   | an app's working surface, tables, forms                     | solid surface, hairline, soft drop                                                       |
| `clay`    | cards, tiles                                                | solid + `--shadow-clay` (outer drop, top light, belly shade)                             |
| `clay-sm` | secondary buttons, chips, segment thumbs                    | `--shadow-clay-sm`                                                                       |
| `pebble`  | app icons, avatars, brand tile                              | app colour + `--shadow-pebble`, squircle                                                 |
| `tray`    | grouped areas inside a sheet                                | `--tray` + inset hairline                                                                |
| `trough`  | inputs, search, switch/meter/slider tracks                  | `--trough` + `--shadow-inset` + `--field-border`                                         |

Every clay and trough element gets a transparent 1 px border, so forced colours still draw an edge; shadows vanish there.

The fallbacks extend to clay:

- **Glass** goes solid under `data-transparency=off` and `prefers-reduced-transparency`. `prefers-contrast: more` also makes borders visible.
- **Clay** keeps its shape.

### 4.4 Shape, space, type, motion

- **Radius (concentric):** shell capsules are pills, sheet 24, card 20, control pill or 14, pebble a squircle at ~28%. Tokens `--radius-{sheet,card,control,pebble}`, each a clamp() where the reference uses one.
- **Space:** the existing 4 px scale plus fluid `--space-fluid-*`. Shell geometry becomes `--shell-*` tokens in `theme/layouts.css`, using clamp() with `cqw`/`cqh` against a `desk` size container, as in reference `20-shell.css`. That covers bar height, pads, gutter, rail width and dock sizes.
- **Density:** `data-density=compact` tightens row heights and paddings through tokens only.
- **Type:** the existing fluid scale. Nothing a person reads is under 12 px; secondary lines are 13 px.
- **Motion:**
  - press squish (scale .96, `--duration-fast`);
  - 2 px hover lift;
  - 150 ms cross-fade between apps;
  - nothing loops;
  - `prefers-reduced-motion` removes all of it.

## 5. Look settings (preferences schema v2)

| Axis         | Attribute            | Values (default first)      |
| ------------ | -------------------- | --------------------------- |
| palette      | `data-palette`       | iris, ocean, coral, emerald |
| mode         | `data-mode`          | light, dark, auto           |
| dock         | `data-dock`          | bottom, side                |
| autoHideDock | `data-dock-autohide` | off, on                     |
| density      | `data-density`       | comfortable, compact        |
| transparency | `data-transparency`  | glass, reduced, off         |

- **Removed:** `layout`, `navType`, `contentWidth`, `sidebar`, `sidebarColors`, `darkPalette`. The OS shell has one structure; the dock position is its one layout choice.
- **Cookie:**
  - Still the `lk_ui` cookie, applied at SSR by `html-shell.ts`, so there is no flash.
  - The codec moves to `v:2`, with an explicit version check: anything else decodes to defaults, with a unit test. The decoder ignores `v` today.
  - Pre-launch, so no migration shim.
- **Where the settings live:**
  - The `ThemeCustomizer` side sheet is replaced by a **Look and feel** panel component, with the same radio groups and a live preview tile.
  - Quick palette and dock controls go in the user menu.
  - Where the full panel is mounted (a Settings page) is page work; until then the user menu opens it as a dialog.
  - `CustomizerTile` stays the only reader of reference ramps; its swatch becomes the logo tile.
- **Other axes** (for example a Home view) are added by the page that needs them.

## 6. The shell

### 6.1 Structure

`AppShell` keeps its `children` and `banner` interface. Inside it:

- `[data-shell=root]` is a `desk` size container with the palette wallpaper.
- `Topbar` is a floating glass capsule.
- `Dock` is glass.
- `[data-shell=content]` holds banners, then `main#main-content`, then the page, between the bar's band and the dock's band. Nothing ever sits under the dock.

### 6.2 Top bar (left to right)

1. **Brand tile:** the logo pebble.
2. **Breadcrumb pill:** "Home › App › …". The first word is the way back. It comes from the catalogue plus the page's crumbs.
3. **Search trough:** opens the existing CommandPalette with Ctrl/⌘K.
4. **New:**
   - Filled brand where the view has no primary of its own.
   - Tonal brand where it does. A page declares this through a shell context flag.
   - Its menu lists the catalogue's create actions that the viewer is allowed.
5. **Bell:** a generic bell button with an unread count and a glass popover slot. Wiring it to `/api/v1/notifications` is page or feature work.
6. **User pill:** avatar, name, role. The menu holds account, quick look settings, the Look and feel dialog, and sign out.

Below 1000 px container width the bar gives up words before wrapping: crumb text first, then the search placeholder.

### 6.3 The dock — the OS rule

- **One shape on every screen.** Opening an app moves the highlight and nothing else, like the macOS Dock, the iOS tab bar or the Windows taskbar. There is no compact state inside apps. (Owner ruling, 2026-11-25.)
- **Contents:**
  - The catalogue's apps the viewer may open: a pebble icon with its name under it.
  - A divider before Settings.
  - A count badge slot, neutral, or red when the source flags urgency. Each app's count source is wired by its page later; no source, no badge.
  - The accessible name includes the count. The current app gets `aria-current="page"`.
- **Position:**
  - `bottom` (default): centred, with its own band.
  - `side`: a slim named rail on the left, and content moves right.
  - One component and one token set, swapped by `data-dock`.
- **Auto-hide** (off by default, the macOS model):
  - When on, the bottom dock tucks under the edge and returns on pointer-at-edge, Tab focus or its handle.
  - Container heights under ~560 px (a phone on its side, heavy zoom) auto-hide regardless. This depends on device size, never on which app is open.
- **Overflow:** the dock scrolls inside itself, keeping names. At phone width the tab bar takes over.
- **Keyboard:**
  - Roving tabindex: the dock is one Tab stop, and arrows move inside it.
  - `g` + a letter switches app.
  - `?` opens a shortcut sheet (milk dialog).

### 6.4 Phone (container ≤ 640 px, or coarse pointer and ≤ 760 px)

- **Tab bar:**
  - The 4 highest-`phonePriority` apps the viewer may open, with labels of at least 12 px.
  - A large centre **+** (New).
  - **More** opens a sheet with the rest.
- **Top bar:** title + search + bell.
- Safe areas come from `env(safe-area-inset-*)`. Bottom sheets use vaul-svelte.
- **Selection:** while rows are selected, the bulk-action bar takes the tab bar's place, as the iOS selection toolbar does. So a phone has at most two glass layers.

### 6.5 The app catalogue (single source of truth)

`src/lib/config/nav.ts` becomes the **app catalogue**. Each app has:

- `key`, name, lucide icon, `accent` token;
- `routes` (its route keys and section views);
- `access` (any-of permissions) and `context` (own / scope / both), as today;
- `phonePriority`;
- an optional `count` source;
- `create` actions.

It still drives the server route guards (`routeForPath`). An app's sub-views render as that app's section nav, never in the dock.

| App                        | Routes today                                                                                   | Seen by (existing permission keys)                    |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Home                       | `/dashboard`                                                                                   | everyone                                              |
| Leads                      | `/leads`                                                                                       | `crmLeadsRead`                                        |
| Orders                     | `/orders`, quotations                                                                          | `ordersOrdersRead` / `ordersQuotationsRead`           |
| Stock                      | `/inventory`                                                                                   | `inventoryCatalogRead`                                |
| Team                       | `/settings/users`, `/settings/roles`, hierarchy; a "to approve" view of `/permission-requests` | identity users/roles view                             |
| Settings                   | `/settings/account/*`, `/settings/tenant/*`; "My access requests" (`/permission-requests`)     | everyone (account, requests); tenant admins (company) |
| Companies (LeadKart staff) | `/operator/tenants`, `/operator/scope/*`                                                       | platform tenants view                                 |
| People (LeadKart staff)    | `/operator/persons`                                                                            | platform users view                                   |

- **Only apps that exist** and that the viewer may open are listed. Dispatch, Payments and Reports join when their pages exist.
- **Route paths do not change here.**
- **Permission requests** keep one route and one access rule (any member, own context). They are reachable from Settings for everyone, and from Team, filtered to approvals, for approvers.
- **LeadKart staff inside a company** (the `lk_op_tenant` cookie is set):
  - The context banner stays.
  - The dock shows Home, Companies (highlighted, with the company's profile, members, roles, activity and settings as section nav), and Leads, Orders and Stock (`context: 'both'`).
  - Team and Settings (own-only) are absent.
  - The breadcrumb reads "Home › Companies › {company}".
  - Leaving the company restores the normal dock.
  - The existing `context` field expresses all of this.

## 7. Components

Every primitive keeps its API and behaviour. Only the skin changes, through cva variants and the new tokens.

### 7.1 Primitives (re-skin)

| Group                         | Look                                                                                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Button**                    | `primary` (brand clay), `tonal`, `secondary` (white clay), `ghost`, `destructive`, `link`; sm/md/lg; icon-only; loading. One primary per view (a review rule).                                                          |
| **Fields**                    | Input, Textarea, Select trigger, Combobox, DatePicker field: trough + `--field-border` + focus ring. The existing `field` label/hint/error set.                                                                         |
| **Choice**                    | Checkbox, Radio, Switch (trough track, clay knob), Slider, ToggleGroup/segmented (tray + clay thumb), Tabs (segmented).                                                                                                 |
| **Status and identity**       | Badge/StatusPill: status tint + word + glyph. CountBadge: neutral, red when urgent. Avatar: pebble.                                                                                                                     |
| **Containers**                | Card (clay), StatCard (clay KPI tile), EmptyState (icon + caption), Skeleton (tray, static under reduced motion).                                                                                                       |
| **Overlays**                  | Dialog, AlertDialog, Sheet, Drawer (vaul), Popover, Dropdown, Tooltip, Toast: milk. Command/⌘K: glass.                                                                                                                  |
| **Data**                      | DataTable on a sheet (sticky header, density from the setting, bulk bar, pagination), Timeline, Kanban, Calendar.                                                                                                       |
| **Charts** (LayerChart theme) | Palette-driven series, status colours for status. Values or an axis always; a partial period drawn lighter; a "view as table" option.                                                                                   |
| **Brand**                     | `BrandMark` → the LK monogram "Two Cuts" (`.superpowers/brainstorm/logo-src/lk/`, monogram 6) as a token-driven SVG: L = brand, K = brand-2. `BrandIcon` → the mark on a clay tile. The wordmark and its hash pin stay. |
| **Static icons**              | favicon, PNG sizes, apple-touch, maskable and manifest icons regenerated from the mark in Iris. `theme_color` (manifest and `app.html`) is written by a script from the token, never hand-typed.                        |

### 7.2 Generic patterns (new, each used in three or more places in the reference)

| Component                   | What it is                                                                                                           | Reference uses                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `AppPebble`                 | an app icon tile in the app's colour, sizes xs to lg                                                                 | dock, tab bar, breadcrumb, section headers, Home places |
| `AppFrame`                  | an app's working sheet with up to three panes (section nav · list · detail), with container-query step-downs (below) | every app                                               |
| `SectionNav`                | an app's sub-views: a vertical list at full width, a segmented control or popover when narrow                        | Orders, Stock, Team, Settings                           |
| `ListRow`                   | avatar or pebble, title, sub-line, meta, amount, trailing action. Names and amounts never drop out.                  | orders, leads, people, dues, dispatch queue             |
| `ActionFooter`              | a pane's reserved footer for its main action; never floats over content                                              | order detail, lead detail, forms, dialogs               |
| `StageStones`               | a journey stepper whose stones double as filters                                                                     | order list filter, order detail, mobile                 |
| `Meter`                     | a fat value bar in a trough, with a label and a value                                                                | stock, packing progress, targets, ageing                |
| `KpiTile`                   | value, one stated time frame, a comparison                                                                           | Home, Reports, Payments                                 |
| `WidgetCard` + `WidgetGrid` | a clay card with one header pattern, on a 12-column grid that reflows by container query                             | Home, Reports, Settings overview                        |
| `StatusTray`                | a tinted tray for a state needing attention (quarantine, overdue, offline)                                           | stock quarantine, payments overdue, PWA offline         |
| `LinkedRecords`             | "related" chips linking a record to its neighbours                                                                   | order, lead, settings                                   |

**`AppFrame` step-downs** (container width):

- ≥ 1100 px: 3 panes;
- ≥ 760 px: 2 panes, with section nav as a segmented control;
- below 760 px: 1 pane, with the detail as a sheet and a back control;
- below 640 px: the phone shell.

Nothing scrolls sideways.

`PageHeader` keeps the single `<h1>`. The `(dev)/styleguide` route becomes the **catalogue**: every token, primitive and pattern, with states, in all four palettes and both modes.

## 8. Build stages

Each stage ends green on the full local gate set and gets an Opus review. The owner gets screenshots at each checkpoint: light and dark, desktop, 1093×614 and 360.

**Visual-regression suite:** its baselines are Linux-only and come from CI, so it is not part of the local stage gate. It is re-baselined at each owner-approved push, and the new images are reviewed by eye. Every other gate (unit, e2e, a11y, contrast, arch, size, blur) stays green at every stage, including on the existing pages.

| Stage              | Contents                                                                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Foundations** | §4 and §5: palettes, semantic roles, the dark design, materials, shape/space/motion tokens, preferences v2, the contrast gate covering 4 palettes × 3 modes × materials, the token fixture re-recorded. Catalogue: the token pages. |
| **2. Components**  | §7: primitives re-skinned, the 11 patterns built with unit tests, brand mark and static icons. Catalogue: every component and state.                                                                                                |
| **3. Shell**       | §6: top bar, dock (both positions, auto-hide, tuck), phone tab bar, app catalogue, Look and feel panel, shortcut sheet; the customizer sheet removed. Existing pages render inside it unchanged.                                    |
| **4. Checkpoint**  | The full suites, the CLAUDE.md rewrite (§9), then a push with the owner's OK and CI re-baselining.                                                                                                                                  |

After this, pages are designed and built one at a time on the system, starting with the auth pages.

**Left to the builder:**

- exact oklch steps (they must hit the reference's button, text and ink steps and pass the gate);
- dark values;
- operator app colours;
- squircle technique;
- token names beyond those fixed here;
- test layout.

## 9. Quality gates

| Gate                                      | Change                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contrast** (`check-token-contrast.mjs`) | 4 palettes × light/dark/auto. Materials over the worst wallpaper. Field borders, meters and switch tracks 3:1 or better. White on every app pebble 3:1 or better. Tonal ink 4.5:1 or better.                                                                                                                |
| **Visual**                                | Every baseline changes. The matrix follows the new axes (palette, mode, dock, auto-hide, density, transparency). New shots: dock bottom vs side, phone tab bar, 1093×614, 200% zoom at 1280×720, catalogue pages. Baselines come from CI only.                                                              |
| **a11y**                                  | axe on every route in both dock positions and on the catalogue. Keyboard e2e: dock roving focus, `g`-chords, the shortcut sheet, nothing focused hidden under the dock (WCAG 2.4.11).                                                                                                                       |
| **Reflow**                                | Playwright at 360, 768, 1093×614 and 1280×720 at 200% on the shell and the `AppFrame` catalogue page: no sideways scroll, names and amounts visible.                                                                                                                                                        |
| **Blur budget**                           | The limits in `material-budget.spec.ts` stay exactly as they are. The states it drives change, because the horizontal layout, the customizer sheet and the sidebar are gone. The new states are: bottom dock, side dock, ⌘K open, phone tab bar, phone with rows selected. The auth-card glass check stays. |
| **Retired tests**                         | `customizer.spec.ts`, `shell-layouts.spec.ts`, and the visual `customizer` and `nav` suites test removed axes and the sidebar. Each is replaced in the same commit by a spec for its successor (Look and feel, dock positions, auto-hide, tab bar, scoped-operator dock). Coverage never drops.             |
| **Size**                                  | CSS ≤ 60 KB gz, unchanged.                                                                                                                                                                                                                                                                                  |
| **Brand tests**                           | `brand.test.ts` and `brand-palette.test.ts` are rewritten for the new mark and the 4 palettes: a reviewed rewrite, not a loosening.                                                                                                                                                                         |
| **CLAUDE.md**                             | The "Visual canon" and "Design implementation discipline" sections are rewritten: Pebble World v8 plus this spec are the visual source of truth, and Domiex is a structure reference only. The stale GlassSurface / Svelte Bits rows go.                                                                    |

## 10. Owner approvals needed (protected files)

1. Re-record the token fixture, renamed `tokens-light-iris.json`.
2. Regenerate all visual baselines through CI at an approved push.
3. Retire the Domiex layout options (layout, nav type, content width, sidebar size, sidebar colours, dark palette) and black-white mode, in favour of the dock setting.
4. Commit the reference page (`node build.mjs --only=world`, ~520 KB) to `docs/design/pebble-world/reference.html`, so the visual spec lives in the repo.
5. Rewrite the protected shell specs for the new shell: blur-budget driving states with the limits unchanged, and the retired customizer, layout and nav specs, each replaced in the same commit.
