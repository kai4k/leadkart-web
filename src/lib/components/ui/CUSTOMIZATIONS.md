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

## Not generated (LeadKart composites, plan L16)

`AuthCard`, `ConfirmDialog`, `CopyButton`, `DescriptionList`, `EmptyState`, `Logo`, `StatCard`,
`StatusPill`, `kanban/`, `stepper/`, `timeline/`, `spinner/`, and the legacy `data-table/`.

## Stacking

Generated `z-50` becomes the token scale (`--z-overlay` 1200 for scrims, `--z-modal` 1300 for
dialog/sheet/alert-dialog panels, `--z-popover` 1400 for popover/dropdown, `--z-tooltip` 1600).
The shell's topbar and footer sit at `--z-sticky` 1100, so a `z-50` sheet slid UNDER them and its
header was clipped (the vaul drawer had the same bug).

## Display family (Task 5)

Regenerated: `button`, `badge`, `alert` (root only), `tabs`, `pagination` (parts), `table`,
`accordion`, `collapsible`, `toggle`, `toggle-group`. Kept as LeadKart composites, with their
alphas fixed: `card` (padding/elevation/surface props, 40+ call sites), `avatar` (initials +
group), `skeleton` (shapes), `progress`, `slider`, `breadcrumb` (items array).

- `button/button.svelte`: `cva` (not tailwind-variants); Domiex sizes (`h-10 px-6` default, `h-8 px-3
text-xs` sm, `h-12 px-7` lg, `icon*` squares); `default` uses `hover:bg-primary-hover`,
  `destructive` is a SOLID fill with `hover:bg-destructive-hover` (the stock one is a translucent
  tint); `outline` keeps `dark:bg-input-fill`; extra `tonal` variant; `loading` (spinner,
  `aria-busy`, disabled) and `focusableWhileLoading`; `href` renders an `<a>` (a disabled one has no
  href). The `aria-invalid:` ring alphas are dropped. `fullWidth` is gone: `class="w-full"`.
- `badge/badge.svelte`: shadcn variants + soft status variants `neutral|info|success|warning|danger|brand`
  on the soft tokens (`bg-success-soft text-success`, ...). `appearance` and `size` are gone.
- `alert/alert.svelte`: LeadKart root (title, icon, dismiss) on soft status tokens; role is `alert` for
  destructive and warning, `status` otherwise. No compound parts (no user).
- `tabs/tabs-trigger`: `text-foreground/60` -> `text-muted-foreground`. `tabs-list`, `toggle`,
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
