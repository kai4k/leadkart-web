/**
 * The one look of a field control that is not a generated `ui/input`: the native Select, the
 * Combobox / DatePicker / DateRangePicker triggers, and the TagInput frame. Same tokens as
 * `ui/input` (`border-input`, `bg-input-fill` in dark, full-strength `ring-ring`, `h-10`), so every
 * control in a form lines up. Extracted at the fourth user (Rule of Three).
 */
export const fieldControlClass = [
	'flex h-10 w-full items-center rounded-md border border-input bg-transparent px-4 text-base text-foreground transition-colors outline-none md:text-sm dark:bg-input-fill',
	'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring',
	'aria-invalid:border-destructive',
	'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50'
].join(' ');
