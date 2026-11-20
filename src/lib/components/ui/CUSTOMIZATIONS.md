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

- `dialog/dialog.svelte`, `sheet/sheet.svelte`: the busy veto (`createBusyVeto`): Escape, outside
  press and every Close are refused while `busy`, bounded by the client read timeout.
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

`AuthCard`, `BrandMark` (icon + live-text wordmark; the icon is a fixed-colour raster until a vector logo source exists), `ConfirmDialog`, `CopyButton`, `DescriptionList`, `EmptyState`, `Logo`, `StatCard`,
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
alphas fixed: `card` (padding/elevation/surface props, 40+ call sites), `avatar` (initials +
group), `skeleton` (shapes), `progress`, `slider`, `breadcrumb` (items array).

- `button/button.svelte`: focus ring offset is `ring-offset-background` (the default offset colour is white:
  a white halo in dark); `secondary` hover is the opaque `--secondary-hover`; `cva` (not tailwind-variants); Domiex sizes (`h-10 px-6` default, `h-8 px-3
text-xs` sm, `h-12 px-7` lg, `icon*` squares); `default` uses `hover:bg-primary-hover`,
  `destructive` is a SOLID fill with `hover:bg-destructive-hover` (the stock one is a translucent
  tint); `outline` keeps `dark:bg-input-fill`; extra `tonal` variant; `loading` (spinner,
  `aria-busy`, disabled) and `focusableWhileLoading`; `href` renders an `<a>` (a disabled one has no
  href). The `aria-invalid:` ring alphas are dropped. `fullWidth` is gone: `class="w-full"`.
- `badge/badge.svelte`: shadcn variants + soft status variants `neutral|info|success|warning|danger|brand`
  on the soft tokens (`bg-success-soft text-success`, ...). `appearance` is gone. `size` is
  `default | sm`: `sm` is the compact badge of dense lists, status columns and card corners.
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
