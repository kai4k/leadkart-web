<!-- src/lib/components/form/DatePicker.svelte -->
<!--
	DatePicker — a date you can TYPE or PICK.

	Typed entry: three segments in the business locale's order (en-IN: day / month / year; `BUSINESS_LOCALE`). Digits type
	and advance on their own, Up / Down step the focused segment, Left / Right move between segments, Backspace clears one;
	Tab moves on to the calendar button. Alt+ArrowDown on any segment opens the calendar (as a native date input does),
	Escape closes it. Calendar: `ui/calendar` in a popover with month and year dropdowns (default 1900 to ten years ahead;
	`minYear` / `maxYear`, or `minValue` / `maxValue`). The ONE `value` and `placeholder` are bound to both, so typing moves
	the calendar to that month and picking a day fills the segments, closes the popover and returns focus to the button.
	bits-ui's grid handles the arrow keys and Enter / Space; PageUp / PageDown and Home / End are NOT implemented by bits-ui.

	The value is a CALENDAR date (`DateValue`, no time, no zone). `valueString` / `onValueStringChange` carry the same date
	as ISO `YYYY-MM-DD` (`toDateOnly`); a hidden input with `name` posts that string. Nothing converts through `Date`, so a
	picked date is the same calendar date in every browser zone.

	Validation belongs to the form (Zod on the date-only string). The component reports INCOMPLETE entry itself: when focus
	leaves the field with some, but not all, segments filled it calls `onIncomplete`, and (when the caller passes no `error`)
	shows "Enter a complete date" with `aria-invalid` on the segment group. A date outside `minValue` / `maxValue` is marked
	invalid by bits-ui and shown as `aria-invalid` too. `aria-describedby` on the group is the error id, then the hint id.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { DateValue } from '@internationalized/date';
	import { Calendar as CalendarIcon, Icon } from '#lib/icons/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Calendar } from '#lib/components/ui/calendar/index.ts';
	import * as DateField from '#lib/components/ui/date-field/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { fromDateOnly, toDateOnly, typedFieldPlaceholder } from '#lib/utils/date-only.ts';
	import { BUSINESS_LOCALE } from '#lib/utils/format.ts';
	import { fieldControlClass } from './field-control.ts';
	import { createTypedDay } from './typed-day.ts';

	type Props = {
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		value?: DateValue;
		onValueChange?: (value: DateValue | undefined) => void;
		/** The same date as ISO `YYYY-MM-DD` (`''` for none). Two-way with `value`. */
		valueString?: string;
		onValueStringChange?: (value: string) => void;
		/** Focus left the field with some, but not all, segments filled. */
		onIncomplete?: () => void;
		placeholder?: DateValue;
		minValue?: DateValue;
		maxValue?: DateValue;
		disabled?: boolean;
		required?: boolean;
		readonly?: boolean;
		locale?: string;
		weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
		/** First and last year offered by the year dropdown. Default: `minValue` / 1900 to `maxValue` / current year + 10. */
		minYear?: number;
		maxYear?: number;
		name?: string;
		id?: string;
		class?: string;
	};

	let {
		label,
		srLabel = false,
		hint,
		error,
		value = $bindable(),
		onValueChange,
		valueString = $bindable(),
		onValueStringChange,
		onIncomplete,
		placeholder = $bindable(),
		minValue,
		maxValue,
		disabled = false,
		required = false,
		readonly = false,
		locale = BUSINESS_LOCALE,
		weekStartsOn = 0,
		minYear,
		maxYear,
		name,
		id,
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `datepicker-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	let open = $state(false);
	// the typed field's own placeholder (a leap year: see typedFieldPlaceholder); the calendar keeps `placeholder`
	let fieldPlaceholder = $state(untrack(() => placeholder) ?? typedFieldPlaceholder());
	let incomplete = $state(false);
	let frame: HTMLElement | undefined = $state();

	const shownError = $derived(error ?? (incomplete ? $_('form.datePicker.incomplete') : null));
	const describedBy = $derived(
		[shownError ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);

	const years = $derived.by(() => {
		const from = minYear ?? minValue?.year ?? 1900;
		const to = maxYear ?? maxValue?.year ?? new Date().getFullYear() + 10;
		return Array.from({ length: Math.max(to - from + 1, 1) }, (_, i) => from + i);
	});

	// the string side drives `value` when the caller changes it (and only then: no ping-pong with onValueChange)
	$effect(() => {
		if (valueString === undefined) return;
		if (valueString !== toDateOnly(value)) value = fromDateOnly(valueString);
	});

	const typedDay = createTypedDay();

	function handleValueChange(typed: DateValue | undefined) {
		const next = typedDay.restore(typed);
		if (next !== typed) value = next;
		if (next && next.year >= 1000) incomplete = false;
		onValueChange?.(next);
		const s = toDateOnly(next);
		valueString = s;
		onValueStringChange?.(s);
	}

	function handleCalendarChange(next: DateValue | undefined) {
		handleValueChange(next);
		if (next) open = false;
	}

	function editableSegments(): HTMLElement[] {
		return [
			...(frame?.querySelectorAll<HTMLElement>('[data-segment]:not([data-segment="literal"])') ??
				[])
		];
	}

	// focus left the whole field (segments + calendar button): some, but not all, segments filled is INCOMPLETE
	function handleFocusOut(e: FocusEvent) {
		if (open || (e.relatedTarget instanceof Node && frame?.contains(e.relatedTarget))) return;
		// a date with a year before 1000 is a half-typed year ("26" is 0026), not a date
		if (value && value.year < 1000) {
			incomplete = true;
			onIncomplete?.();
			return;
		}
		if (value) return;
		const segs = editableSegments();
		const filled = segs.filter((s) => s.getAttribute('aria-valuetext') !== 'Empty').length;
		if (filled > 0 && filled < segs.length) {
			incomplete = true;
			onIncomplete?.();
		} else if (filled === 0) incomplete = false;
	}

	// Alt+ArrowDown opens the calendar; captured so the focused segment never steps its value
	function handleKeyDownCapture(e: KeyboardEvent) {
		typedDay.capture(e);
		if (e.altKey && e.key === 'ArrowDown' && !disabled && !readonly) {
			e.preventDefault();
			e.stopPropagation();
			open = true;
		}
	}
</script>

<Field.Field class={className}>
	<DateField.Root
		bind:value
		bind:placeholder={fieldPlaceholder}
		onValueChange={handleValueChange}
		{minValue}
		{maxValue}
		{locale}
		{disabled}
		{readonly}
		{required}
		granularity="day"
		errorMessageId={shownError ? errorId : undefined}
	>
		<DateField.Label class={srLabel ? 'sr-only' : undefined}>{label}</DateField.Label>

		<div
			bind:this={frame}
			class={cn(
				fieldControlClass,
				'gap-1 py-0 pe-1 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring',
				'data-invalid:border-destructive',
				disabled && 'cursor-not-allowed bg-muted opacity-50'
			)}
			data-invalid={shownError ? '' : undefined}
			onfocusout={handleFocusOut}
		>
			<DateField.Input
				id={fieldId}
				invalid={Boolean(shownError)}
				{describedBy}
				onkeydowncapture={handleKeyDownCapture}
			/>
			<Popover.Root bind:open>
				<Popover.Trigger disabled={disabled || readonly}>
					{#snippet child({ props })}
						<Button
							{...props}
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={$_('form.datePicker.openCalendar', { values: { label } })}
						>
							<Icon icon={CalendarIcon} size="sm" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content align="end" class="w-auto p-0">
					<Calendar
						type="single"
						bind:value
						bind:placeholder
						onValueChange={handleCalendarChange}
						{minValue}
						{maxValue}
						{locale}
						{weekStartsOn}
						captionLayout="dropdown"
						{years}
						{disabled}
						{readonly}
						aria-label={label}
					/>
				</Popover.Content>
			</Popover.Root>
		</div>
	</DateField.Root>

	{#if name}
		<input type="hidden" {name} value={toDateOnly(value)} />
	{/if}

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if shownError}
		<Field.Error id={errorId}>{shownError}</Field.Error>
	{/if}
</Field.Field>
