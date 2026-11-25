# ui/ customizations

`src/lib/components/ui/` is shadcn-svelte CLI output plus the local edits below. Regenerate with the
CLI into a scratch project, copy the component files in, then run
`node scripts/shadcn/normalize.mjs <files>` (imports, icons, logical utilities, opaque tokens; it
fails on any leftover `/<alpha>` on a contrast colour). Then re-apply this list. Never let the CLI
touch `components.json`, `src/app.css` or `package.json` of this repo.

## How the CLI was run (Task 4)

- `shadcn-svelte@1.8.1` installed in a scratch folder with a scratch project (Svelte 5.57, Kit 3.3,
  Tailwind 4.3), `components.json` aliases `$lib/...` for that run only (this repo's `#lib` aliases
  are produced by the normaliser). Style `nova`, `--no-deps-install --overwrite --yes`. The real
  repo's `components.json` is untouched.
- Dependencies the CLI wanted and this repo refused: `tailwind-variants` (button, input-group:
  variants stay `cva`), `mode-watcher` (sonner: the preferences store decides the theme),
  `@lucide/svelte` (already a dependency; icons go through `#lib/icons`), `@internationalized/date`
  (calendar, Task 7). `bits-ui` and `svelte-sonner` were already ours.
- Registry dependencies pulled in and NOT copied: `button`, `input`, `textarea`, `input-group`
  (Tasks 5 and 6 regenerate button/input/textarea; `input-group` is not in the plan's set).
- The CLI's `data-open:`, `data-closed:`, `data-checked:`, ... variants come from its own
  `shadcn-svelte/tailwind.css`. They are copied into `src/app.css` as `@custom-variant`s.

## Edits by file

- `alert-dialog/alert-dialog.svelte`: the same busy veto (`busy`), so a confirmation whose action is in flight refuses
  Escape and Cancel. `alert-dialog-content`: the default width is `sm:max-w-md` (a reason field needs the room), `max-h-[90dvh]` and a flex column (header and footer `shrink-0`, the `ConfirmDialog` body `min-h-0 flex-1 overflow-y-auto`) so a tall confirmation scrolls its body on a phone and keeps its footer reachable;
  `alert-dialog-footer`: no `bg-muted` fill, an opaque `border-border` hairline like the Sheet and Dialog footers
  (an inner panel is never a second material). `ConfirmDialog` (the LeadKart composite) sits on this primitive and
  focuses Cancel on open.
- `dialog/dialog.svelte`, `sheet/sheet.svelte`: the busy veto (`createBusyVeto`): Escape, outside
  press and every Close are refused while `busy`, bounded by the client read timeout.
- `dialog/dialog.svelte`, `sheet/sheet.svelte` (the ROOTS): also `hold` / `onHeld` (a form with unsaved input refuses
  every way out and calls `onHeld` so the caller can ask "Discard changes?"; the busy veto wins). Upstream's root is
  three lines, so these are hand-written files the normaliser cannot derive: `scripts/shadcn/normalize.mjs`
  re-applies `scripts/shadcn/overrides/{dialog,sheet}.svelte.tpl` (stored copies, a test keeps them equal to the
  committed files) whenever its output lacks the busy veto or either marker, and says so. Change the root here, then
  copy it to `overrides/`.
- `dialog/dialog-body.svelte`, `sheet/sheet-body.svelte`: LeadKart additions (scrolling body).
  Dialog body `px-5 py-5`; sheet body `flex-1 overflow-y-auto px-6 py-4`.
- `dialog/dialog-content.svelte`: scrolling layout (`flex max-h-[90vh] flex-col gap-0 overflow-hidden
p-0`, `sm:max-w-lg`) instead of the nova `grid p-4 sm:max-w-sm`, so Header/Body/Footer scroll and
  today's forms keep their width. `closeLabel` prop for the built-in X (English default).
- `dialog/dialog-header|footer|title.svelte`: today's metrics (`px-5 pt-5 pb-3`, `px-5 py-4`, title
  `text-lg font-semibold`); the nova footer's `bg-muted -mx-4 -mb-4` band is dropped.
- `sheet/sheet-content.svelte`: `gap-0`, `closeLabel`; `sheet-title.svelte`: same title size as Dialog.
- `drawer/*`: a shim over `sheet` (plan L17), see its `index.ts`. Header/Body/Footer keep the vaul
  drawer's padding and `flex-col-reverse` footer so leads/orders/inventory render as before.
- `pagination/pagination-link.svelte`: the current page is the `default` (primary fill, primary-foreground) variant, not `outline` (an unreadable chip in dark mode); gate: `primary-foreground on primary`.
- `card/card-title.svelte`: an `<h2>` (the nova output is a `<div>`; a page has one `<h1>`, so its sections are `<h2>`: axe `heading-order`). `EmptyState` title likewise.
- `dropdown-menu/dropdown-menu-trigger.svelte`: NOT regenerated. Keeps the `child` pattern and the
  `variant`/`size` Button props (a `<button>` inside a `<button>` fails axe).
- `dropdown-menu/dropdown-menu-content.svelte`: dropped `w-(--bits-dropdown-menu-anchor-width)` (it
  clips labels wider than an icon-only trigger). `dropdown-menu-item.svelte`: `variant="danger"` is
  accepted as `destructive` (six call sites). `index.ts`: `Menu` and `DropdownMenuMenu` aliases.
- `command/command-input.svelte`: no `input-group`; a search icon and the bits input in one row.
- `tooltip/tooltip-provider.svelte`: `delayDuration` 200 (the app's value), not 0.
- `sonner/sonner.svelte`: takes `theme` from the root layout (no mode-watcher), `position
bottom-right`, `richColors`, `closeButton`, token classes only; icons via `#lib/icons`. The old
  `Toaster.svelte` is gone; `index.ts` still exports `Toaster` and `toast`.
- Normaliser rewrites worth knowing: `bg-black/10` overlays are `bg-black/50` (the one allowed scrim);
  `ring-foreground/10` is `ring-border`; the dropdown's destructive hover is `bg-destructive-soft`.
- Duplicate imports from one module are merged (eslint `no-duplicate-imports`).

- `sidebar/context.svelte.ts` + `sidebar-provider.svelte`: `shortcutEnabled` (false in the horizontal layout), and Ctrl/Cmd+B is ignored when typed into a field or while a dialog/sheet is open. The mobile query is `width < 64rem` (rem, like the CSS).

## Not generated (LeadKart composites, plan L16)

`AuthCard`, `AppPebble` (the one app pebble: an app's icon or the brand mark on `material-pebble`), `BrandMark` (the LK "Two Cuts" monogram drawn inline: L = `--primary`, K = `--brand-2`; optional outlined `BrandWordmark` beside it), `BrandIcon` (the brand `AppPebble` with the mark), `ConfirmDialog`, `CopyButton`, `DescriptionList`, `EmptyState`, `StatCard`,
`StatusPill`, `kanban/`, `stepper/`, `timeline/`, `spinner/`, and the legacy `data-table/`.

## Stacking

The normaliser maps a generated `z-50` per component family (`Z_BY_FAMILY` in
`scripts/shadcn/normalize.mjs`): dialog, sheet and alert-dialog use `--z-modal` (1300) for the panel
AND the scrim; sidebar and table parts use `--z-sticky`; everything else (popover, select, dropdown,
calendar popups) floats at `--z-popover` (1400); tooltip is `--z-tooltip`. The scrim shares the
panel's layer on purpose: scrims at 1200 under panels at 1300 meant a second modal's scrim sat UNDER
the first panel (not dimmed; a click on it was an outside press for the second modal). On one layer
the DOM order decides, and portal order is open order, so a confirm over a form sheet covers it.
The shell's topbar and footer sit at `--z-sticky` 1100, below every modal.

## Overlay names, sizes and close controls (fix round A)

- `dialog-content`, `sheet-content` (and the Drawer shim through them) need an accessible name: a
  `title` prop (rendered as the Title part; `titleHidden` keeps it as the name only), a `Title`
  part, or `aria-label`. `assertOverlayName` (`ui/overlay-name.ts`) throws in development and tests
  when none is present after mount; it is a no-op in a production build.
- `dialog-content` takes `size`: `sm` 24rem, `md` 32rem (default), `lg` 48rem, `xl` 64rem (from
  `sm` up; below it the viewport minus 2rem). `sheet-content` takes `size` for left/right sheets:
  `sm` 24rem, `md` 32rem, `lg` 40rem (default). Call sites use a named size, never a `max-w-*`
  override. The project's page-width tokens are `--page-width-*`, not `--container-*`: Tailwind v4
  derives `max-w-sm|md|lg|xl|2xl` from `--container-*`, and reusing the names silently made
  `max-w-lg` 64rem.
- A close control is ONE element: `<Dialog.Close>{#snippet child({ props })}<Button {...props}>` .
  A `<button>` or `<Button>` nested in a Close part (which is itself a button) is invalid HTML.
- `command/command-dialog.svelte`: the sr-only Header (title, description) is inside `Content`.
- `sonner/sonner.svelte`: no `richColors`; success, error, warning and info toasts are the soft status
  fill + a full-strength status border + a status icon, tokens only (`!` beats sonner's unlayered
  per-toast background).

## Labels (the i18n pattern for shared primitives)

`ui/**` and `form/**` may import the `svelte-i18n` `_` store for DEFAULT labels (`common.close`,
`common.pagination.*`, `form.calendar.*`, `form.combobox.*`, ...); they still must not import from
`features/**`. A caller overrides any label through a prop. There is no labels context. bits-ui's own
English defaults ("Previous", "Select a month", pagination labels) are overridden through its props.

## Highlight, hover and selection (fix round A)

- `.item-highlight` (`src/styles/utilities.css`): the one indicator of the active item in every popover
  list (command, combobox, dropdown, select, TagInput suggestions): a 2px start-edge bar in `--ring`
  (3:1 on the popover, gated). The fill alone (`--muted` on `--popover`) is ~1.35:1.
- `table/table-row.svelte`: hover is the opaque `--row-hover` (half way between card and muted); a
  selected row (`data-[state=selected]`) is `--muted` with a 3px start-edge `--ring` bar (mirrored in RTL).

## Display family (Task 5)

Regenerated: `button`, `badge`, `alert` (root only), `tabs`, `pagination` (parts), `table`,
`accordion`, `collapsible`, `toggle`, `toggle-group`. Kept as LeadKart composites, with their
alphas fixed: `card` (padding and `surface` clay|sheet|tray props, 40+ call sites), `avatar` (initials +
group), `skeleton` (shapes), `progress`, `slider`, `breadcrumb` (items array).

- `button/button.svelte`: focus ring offset is `ring-offset-background` (the default offset colour is white:
  a white halo in dark); `secondary` hover is the opaque `--secondary-hover`; `cva` (not tailwind-variants); Pebble World sizes (`h-9 px-4` sm, `h-11 px-5` md, `h-13 px-6` lg, `size-11` icon, `size-9` icon-sm;
  44 px is the touch floor); variants `primary` (clay, `hover:bg-primary-hover`; ONE per view), `tonal`, `secondary`, `ghost`, `link`,
  `destructive` (a SOLID clay fill with `hover:bg-destructive-hover`; the stock one is a translucent
  tint); the shadcn `default` and `outline` are renamed `primary` and `secondary`; the active pagination page is `tonal`; `loading` (spinner,
  `aria-busy`, disabled) and `focusableWhileLoading`; `href` renders an `<a>` (a disabled one has no
  href). The `aria-invalid:` ring alphas are dropped. `fullWidth` is gone: `class="w-full"`.
- `badge/badge.svelte`: shadcn variants + soft status variants `neutral|info|success|warning|danger|brand`
  on the soft tokens (`bg-success-soft text-success`, ...). `appearance` is gone. `size` is
  `default | sm`: `sm` is the compact badge of dense lists, status columns and card corners. `count` (neutral)
  and `count-urgent` (danger tokens) share one base; a count takes a `label` ("12 unread") that screen
  readers get instead of the bare number, and an urgent count adds a warning glyph and always says "urgent".
- `StatusPill`: tint + word + a shape per status (check, alert, cross, info; a dot for neutral and brand).
- `StatCard` `accent`: `primary` and `neutral` are identity; `warning` and `danger` are status, for a tile that
  counts something at risk or overdue only.
- `tooltip/tooltip-content`: milk (spec 7.1), not the inverted foreground fill.
- `alert/alert.svelte`: LeadKart root (title, icon, dismiss) on soft status tokens; role is `alert` for
  destructive and warning, `status` otherwise. No compound parts (no user).
- `tabs/tabs-trigger`: `text-foreground/60` -> `text-muted-foreground`; the active tab has a
  `border-input` border in light too (it was dark only): the active fill alone is ~1.2:1 on the tab list. `tabs-list`, `toggle`,
  `toggle-group`: tailwind-variants -> `cva`.
- `pagination/*`: bits-ui parts as generated. The app's pager is `data/Pagination.svelte`
  (`page / pageCount / onChange`, plus `label`).
- Normaliser additions: `cn-rtl-flip` -> `rtl:rotate-180`, relative `index.js` -> `index.ts`,
  `aria-invalid:(ring|border)-destructive/N` dropped.
- Deleted (L16, no users): `aspect-ratio`, `button-group`, `combobox`, `context-menu`,
  `date-picker`, `form`, `hover-card`, `kbd`, `menubar`, `navigation-menu`, `tree`, `InlineEdit`.

## Field family (Task 6)

Regenerated: `field`, `input`, `textarea`, `label`, `checkbox`, `radio-group`, `switch`, `select`
(`calendar` and `range-calendar` follow in Task 7). Same CLI run as Task 4. The normaliser now also
converts `tailwind-variants` to `cva` (`base` string form), drops `aria-invalid:ring-3` (its ring
colour was an alpha; the invalid border `aria-invalid:border-destructive` is the signal), drops the
dark switch thumb `bg-foreground` (2.4:1 on the gray dark `input` track), and rewrites `z-50` to
`z-(--z-popover)`, selected-card tints to `bg-primary-soft` / `border-primary`, disabled / hover
`bg-input/50|80` to `bg-muted`, and `bg-accent/50` to `bg-accent`.

- `input/input.svelte`: `h-10 rounded-md px-4 py-2` (Domiex `.form-input`) instead of nova's `h-8
rounded-lg px-2.5 py-1`, both branches.
- `textarea/textarea.svelte`: `rounded-md px-4 py-2`; `field-sizing-content` removed (it ignores `rows`).
- `field/field.svelte`: no `role="group"` (a nameless group on every field is noise; RadioGroup is
  its own group). `field-separator.svelte`: `Boolean(children)` (eslint no-implicit-coercion).
- `radio-group/radio-group-item.svelte`: the dot is centred with `absolute inset-0 m-auto` (the
  generated `left-1/2 -translate-x-1/2` is a physical direction, `check-rtl-safety`).
- `select/*` is generated and unused by any field (the form `Select` is native, plan L36).
- Used by: `form/{TextField,PasswordField,NumberInput,Switch,RadioGroup,RadioItem,Select,TextareaField}`.
  They wrap `Field.Field` > `Field.Label` + control + `Field.Description` + `Field.Error`; ids come from
  `$props.id()`. The hint and the error are both shown and both in `aria-describedby`.

## Calendar family (Task 7)

Regenerated: `calendar`, `range-calendar` (same CLI run; `@internationalized/date` is already a
direct dependency, a peer of bits-ui). The `locale` default is `en-US`: the form pickers pass theirs.
Hand edits on top of the normaliser output (fix round A; regeneration must re-apply them):

- `calendar-day` / `range-calendar-day`: a selected day (and range start / end) keeps
  `text-primary-foreground` on hover (the generated `hover:text-foreground` turned it dark on the
  primary fill); "today" is an inset `ring-ring` marker, not `bg-accent` (that was also the hover
  fill); the range middle shows a hover ring (its cell is `bg-accent`, the same as a hover fill);
  focus is `focus-visible:` with a 2px `ring-ring` and a `ring-offset-popover` offset (the generated
  `focus:ring-ring` had no ring width).
- `calendar-prev|next-button`, `range-calendar-*`: render through bits' `child` snippet so the
  `aria-label` is localised (`form.calendar.previousMonth|nextMonth`); bits sets its own English
  "Previous" / "Next" after the caller's props. `*-month-select`, `*-year-select` pass a localised
  `aria-label` (`form.calendar.month|year`) through bits' own prop (the default is English).

Other: opaque hover `bg-accent`. Contrast pairs the cells rely on are in `check-token-contrast`:
`primary-foreground` on `primary` (selected, range ends), `accent-foreground` on `accent` (today),
`muted-foreground` on `popover` and `accent` (weekday heads, outside days).

## sidebar (Task 10)

Regenerated from the same CLI run (`add sidebar`; it also brings `hooks/is-mobile`, whose registry
dependencies tooltip, skeleton, separator, button, input and sheet are ours already and were not
copied). `tailwind-variants` in `sidebar-menu-button` became `cva` (normaliser), icons go through
`#lib/icons`. Hand edits on top of the normaliser output:

- `context.svelte.ts`: `class SidebarState` is the factory `createSidebarState(props)` (getters over
  local `$state` / `$derived`; `check-no-class-stores`). It also closes the mobile sheet when the
  viewport grows past `lg` (the effect the old AppShell had), so the sheet does not reopen on the way back.
- `hooks/is-mobile.svelte.ts`: `class IsMobile` is `createIsMobile(breakpoint = 1024)`, `lg` not `md`.
- `constants.ts`: the widths and the `sidebar_state` cookie constants are gone (widths are
  `styles/theme/layouts.css`; the open state is the `sidebar` preference in `lk_ui`).
- `sidebar-provider.svelte`: no `document.cookie` write, no inline `--sidebar-width*` style;
  `open` / `onOpenChange` are controlled by AppShell (`open = prefs.sidebar !== 'small'`).
- `sidebar.svelte`: every `md:` is `lg:`; no in-flow gap element (the page is offset by
  `--shell-content-start`); the fixed container is `top-[max(var(--shell-sidebar-top),var(--safe-top))]
bottom-(--shell-sidebar-bottom) start-(--shell-sidebar-start)` at `z-(--z-sticky)`; the border (and
  the semibox radius) sit on the inner pane; the mobile Sheet is named (`common.navigation`, hidden
  title), keeps the Sheet's visible, named Close (touch users have no Escape; fix round B), starts below
  `--safe-top` (`pt-(--safe-top)`) and has `--sidebar-width-mobile` width.
- `sidebar-menu-button.svelte`: the tooltip's `side` is `inlineEndSide()` (`utils/direction.ts`: right in
  LTR, left in RTL; bits-ui's side is physical). The tooltip exists only while the sidebar is icon-only and not in the
  sheet. A tooltip that stays open on a focused expanded item is a dismissible layer and took the first
  Escape away from the sheet.
- `sidebar-trigger.svelte`: `aria-expanded`, localised name (`shell.toggleSidebar`, prop `label`),
  icon from `#lib/icons`.
- `sidebar-rail.svelte` deleted (the toggle is the one control; a drag rail has no preference to write).
- Everything else is unchanged. Call sites override the item look through `class` (NavItem).

## bits-ui boundary

bits-ui is imported only under `src/lib/components/ui/**` (gate `check-bits-ui-boundary`); form
components, features, layouts and routes compose these files. The form Combobox is a `Popover` +
`Command`, the DatePicker a `Popover` + `Calendar`, the DateRangePicker a `Popover` + `RangeCalendar`.

## fix round B additions

- `sheet/sheet-content.svelte`: the slide-in/out classes are physical (`slide-in-from-left`) while the
  position is logical (`start-0`), so in RTL a start-edge sheet slid in from the wrong side. `rtl:` variants
  swap the slide direction for `data-side=left|right`.
- `alert/alert.svelte`: a `role="alert"` banner has `tabindex="-1"` and a focus-visible ring so a failed
  submit that marked no field invalid (409, 429, expired session, 5xx) can move focus to it
  (`focusFirstInvalid`) instead of dropping it on `<body>`. It is not a tab stop.
- `alert/alert.svelte` (fix round C): a `role` prop overrides the derived role (`note` for a static
  warning inside a form: it is not a change the user must be told about, and it no longer takes
  focus from the error), and a `destructive` Alert carries `data-form-error` so `focusFirstInvalid`
  focuses the form's error banner first, then any other `role="alert"`.

## radio-group tile (Task 15)

`radio-group/radio-group-tile.svelte` is a LeadKart addition: the same bits-ui `RadioGroup.Item` (roving
focus, `aria-checked`, Space/Enter) rendered as a whole tile (a preview plus its label) instead of a
circle. It carries only the layout and the focus ring; the checked look is the caller's
(`group-aria-checked/tile:`), because the tile's content decides it. Used by the ThemeCustomizer
(`layouts/CustomizerTile.svelte`); the regenerated circle `Item` is unchanged.

## Primary roles (plan G1)

The primary colour has three roles and the normaliser (`scripts/shadcn/normalize.mjs`) writes them:

- A bare `text-primary` becomes `text-primary-text` everywhere (a link, an active label: 4.5:1 on every
  surface); `hover:text-primary-hover` becomes `hover:underline` (a link does not change colour on hover).
- In the `checkbox`, `radio-group`, `switch`, `slider`, `progress` and `tabs` folders (`INDICATOR_FAMILIES`)
  `bg-primary`, `border-primary`, `text-primary-foreground` and `bg-primary-foreground` become the
  `primary-indicator` tokens (non-text marks, 3:1). `button`, `badge` and the other labelled fills keep
  `bg-primary` + `text-primary-foreground`: the fill is vivid and the label is white or step 950.
- Hand edits recorded here: `StatCard`, `StatusPill`, `stepper/StepperStep` and `avatar/avatar-group` read
  `text-primary-text` where they wrote `text-primary` inside a variant map the normaliser does not reach;
  `progress/Progress.svelte` and `slider/Slider.svelte` are normalised files.
- The hand-written `radio-group/radio-group-tile.svelte` keeps `border-primary` (a selected tile is a fill
  boundary, gated through `primary` on the surfaces by the labelled-fill pairs).

## Materials (plan G2)

`dialog/dialog-overlay`, `alert-dialog/alert-dialog-overlay` and `sheet/sheet-overlay` read `bg-scrim`
(the `--scrim` token: 35% light, 55% dark, never blurred) instead of shadcn's
`bg-black/50 supports-backdrop-filter:backdrop-blur-xs`. The normaliser rewrites both classes
(`bg-black/10|50` -> `bg-scrim`; the blur class is dropped). The panels move to the milk material (first `material-pane`, now `material-milk`).

## Milk material (plan G5; `material-pane` became `material-milk` in the Pebble World rework)

`scripts/shadcn/normalize.mjs` has a `MATERIAL_BY_FAMILY` map. In the `dialog`, `alert-dialog`, `sheet`, `popover`, `dropdown-menu` and `select` folders:

- a content file (`*-content.svelte`): `bg-popover` becomes `material-milk`; `shadow-md`, `shadow-lg`, `ring-1` and `ring-border` go (the material draws its own edge and shadow); `rounded-lg|md` becomes `rounded-xl`. A sheet also loses its `data-[side=*]:border-*` classes (the edge replaces them);
- an item file (`*-item`, `*-checkbox-item`, `*-radio-item`, `*-sub-trigger`, and `command-item` / `command-link-item`): `rounded-sm|md` becomes `rounded-lg`;
- `command/command.svelte`: the root `bg-popover` becomes `bg-transparent` (the command dialog, or the popover a combobox list sits in, is the material). Select's scroll buttons keep the opaque `bg-popover`: they must hide the rows that scroll under them.

Hand edit, recorded: `sonner/sonner.svelte`. The neutral toast is `not-data-[type]:material-milk!` (sonner paints its own background unlayered, so the material needs `!`; a typed toast has `data-type` and keeps its soft status fill). `--normal-bg` is no longer set; `--normal-border` is transparent (the material draws the edge).

`cn()` treats the eleven material utilities (bar, glass, milk, sidebar, sidebar-bar, sheet, clay, clay-sm, pebble, tray, trough) as one class group that conflicts with `bg-*`, so a caller's `class` cannot leave two backgrounds on one element. Tests: `tests/unit/components/material-surfaces.test.ts`, `tests/unit/utils/cn.test.ts`, `tests/unit/scripts/shadcn-normalize.test.ts`.

## Shell on materials (plan G6)

Hand edit, recorded: `sidebar/sidebar.svelte`. The desktop `[data-slot=sidebar-inner]` and the mobile `Sheet.Content` are `material-sidebar` (the sidebar colour as glass; five sidebar colours are five tinted glasses). The inner element lost `bg-sidebar` and its `border-e` / `border-s` / semibox `border` classes (the material's edge replaces them); the floating variant keeps its radius. The mobile sheet's `material-sidebar` replaces the `material-milk` the sheet content carries (`cn()` treats the material utilities as one class group). `collapsible="none"` keeps its opaque `bg-sidebar`.

`sidebar/sidebar-menu-button.svelte` is unchanged: the active and hover fill is already the opaque `sidebar-accent` with `sidebar-accent-foreground` and `font-medium`.

## Shape language (plan G7)

- `button/button.svelte` (hand edit, recorded): every variant except `link` is a capsule (`rounded-full`), at every size including the icon sizes; the base class carries no radius, so `link` has none. Inputs stay `rounded-md` rectangles, as Apple's text fields do.
- `card/card.svelte`: the `surface="glass"` variant (it was an opaque card all along) is deleted; the dashboard tiles use the default surface. Cards stay opaque content (`shadow-card`).
- Items: the normaliser (`normalizeClasses`, role `item`) adds `font-medium` to the `text-sm` of `*-item`, `*-checkbox-item`, `*-radio-item`, `*-sub-trigger` and `command-item` (a composited layer loses subpixel antialiasing, so a label on glass is weight 500 at least). Added once; idempotent. Items are `rounded-lg` inside the `rounded-xl` pane (concentric: 1rem outer, 0.75rem inner, `p-1` on the list). Tests: `tests/unit/scripts/shadcn-normalize.test.ts`, `tests/unit/components/{button,shape-language}.test.ts`.

## Corrections after G7-G9 (controller round)

- `command/command-list.svelte` (hand edit, recorded; regenerate and re-apply): the bits `Command.Viewport` is the `role="listbox"` (named by `aria-label`, default `common.commandPalette.results`) inside the List element, which becomes a `role="presentation"` scroll box. bits points the input's `aria-controls` at the viewport id and sets none without one, so the palette's combobox used to name nothing (axe `aria-required-attr`). A caller's `id` goes on the listbox (Combobox's `aria-controls`). A caller's `aria-multiselectable` goes on the listbox too (FilterBar's multi-select checklist, where `aria-selected` is the chosen state).
- `avatar/avatar.svelte`, `avatar/avatar-group.svelte`: sizes are `size-N` (`inline-size-N block-size-N` are not Tailwind utilities, so the avatar was content-sized and clipped its initials); the avatar is `shrink-0`.
- `drawer/drawer-header.svelte` (legacy shim, goes with the Phase 2 form sheet): a direct-child `<button>` (the Close) is absolutely placed at the header's inline-end top corner, 24 x 24 at least, `focus-visible` ring; the header reserves `pe-14` for it.

## Date fields (plan G10)

Non-CLI composites (the shadcn-svelte registry has no `date-field` entry in the pinned CLI). bits-ui's `DateField` and `DateRangeField` are NOT used: they constrain a day beyond the month (31 / 02 becomes 28 / 02) and report a half-typed year as a date, and a business date must never show or emit a date the user did not type. The typed text is owned here; bits-ui stays for the calendar (`ui/calendar`, `ui/range-calendar`, `ui/popover`).

- `date-field/{date-field-label,date-field-input,date-field-segment}.svelte`: the label, the segment group and the segment. The group (`role="group"`) holds three `role="spinbutton"` segments in the locale's order (`utils/typed-date.ts`: pure rules for typing, stepping, padding and resolving; no DOM). `value` is a real date inside the year bounds or nothing; `resolved` (`empty` | `partial` | `valid` | `invalid` + reason) is bindable for the picker. The group takes `describedBy`, `invalid`, `labelledBy` / `ariaLabel`. A start and an end are two groups (the range picker uses the same component twice). Virtual keyboards deliver digits through `beforeinput`. Segments are 24 x 24 at least (WCAG 2.5.8); the literal separator is zero-width and its glyph overflows into the empty sides of the neighbours, so the date reads as compactly as a typed one.
- `form/DatePicker.svelte` and `form/DateRangePicker.svelte` compose these with `ui/calendar` / `ui/range-calendar` in a `ui/popover` (a pane) and own the messages (does not exist, year range, complete date). `utils/date-only.ts` is the date-only wire format (`toDateOnly`, `fromDateOnly`, never `Date`).
