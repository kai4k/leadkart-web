<!-- src/lib/components/form/DatePicker.svelte -->
<!--
	DatePicker — a date you can TYPE or PICK.

	Typed entry: three segments in the business locale's order (en-IN: day / month / year; `BUSINESS_LOCALE`). Digits type
	and advance on their own, Up / Down step the focused segment, Left / Right move between segments, Backspace removes a
	digit; Tab moves on to the calendar button. Alt+ArrowDown on any segment opens the calendar (as a native date input
	does), Escape closes it. Calendar: `ui/calendar` in a popover with month and year dropdowns (default 1900 to ten years
	ahead; `minYear` / `maxYear`, or `minValue` / `maxValue`). The ONE `value` is bound to both: typing a real date moves the
	calendar to that month and picking a day fills the segments, closes the popover and returns focus to the button.
	bits-ui's grid handles the arrow keys and Enter / Space; PageUp / PageDown and Home / End are NOT implemented by bits-ui.

	The field never shows or emits a date the user did not type. The segments keep exactly what was typed: `31 / 02 / 2026`
	stays as typed and the field is INVALID ("This date does not exist"); a year with fewer than four digits is not a year, so
	nothing is emitted while it is half typed (and "Enter a complete date" shows once focus leaves); a year outside
	`minYear`..`maxYear` is invalid and the message names the range. An invalid or incomplete entry emits NO value: `value`
	and `valueString` are empty, the hidden input posts `''`, and the group is `aria-invalid` with the message in
	`aria-describedby` (the error id, then the hint id). Fixing the day, month or year makes it valid again. A date picked in
	the calendar is always real.

	The value is a CALENDAR date (`DateValue`, no time, no zone). `valueString` / `onValueStringChange` carry the same date
	as ISO `YYYY-MM-DD` (`toDateOnly`); a hidden input with `name` posts that string. Nothing converts through `Date`, so a
	picked date is the same calendar date in every browser zone.

	Cross-field rules (required, not before another date) belong to the form. `onIncomplete` fires when focus leaves the
	field with a partial entry; a caller's `error` replaces the field's own message.
-->
<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { DateValue } from '@internationalized/date';
	import { Calendar as CalendarIcon, Icon } from '#lib/icons/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Calendar } from '#lib/components/ui/calendar/index.ts';
	import * as DateField from '#lib/components/ui/date-field/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { fromDateOnly, toDateOnly } from '#lib/utils/date-only.ts';
	import { yearBounds, type Resolved } from '#lib/utils/typed-date.ts';
	import { BUSINESS_LOCALE } from '#lib/utils/format.ts';
	import { fieldControlClass } from './field-control.ts';

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
	let incomplete = $state(false);
	let frame: HTMLElement | undefined = $state();
	let input: { clear(): void } | undefined = $state();

	/** Forget the typed text (a programmatic reset: the form's native `reset` event is handled by the field itself). */
	export function clear() {
		input?.clear();
		incomplete = false;
	}
	let resolved = $state<Resolved>({ status: 'empty' });

	const bounds = $derived(
		yearBounds(minYear, maxYear, minValue, maxValue, new Date().getFullYear())
	);
	const years = $derived(
		Array.from({ length: Math.max(bounds.to - bounds.from + 1, 1) }, (_, i) => bounds.from + i)
	);

	const ownError = $derived.by(() => {
		if (resolved.status === 'invalid')
			return resolved.reason === 'yearRange'
				? $_('form.datePicker.yearRange', { values: { min: bounds.from, max: bounds.to } })
				: resolved.reason === 'notExist'
					? $_('form.datePicker.notExist')
					: $_('form.datePicker.outOfRange');
		return resolved.status === 'partial' && incomplete ? $_('form.datePicker.incomplete') : null;
	});
	const shownError = $derived(error ?? ownError);
	const describedBy = $derived(
		[shownError ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);

	// the string side drives `value` when the caller changes it (and only then: no ping-pong with onValueChange)
	$effect(() => {
		if (valueString === undefined) return;
		if (valueString !== toDateOnly(value)) value = fromDateOnly(valueString);
	});

	// the field (typed) or the calendar (picked) changed the value: tell the caller, in both forms
	function handleValueChange(next: DateValue | undefined) {
		if (next) incomplete = false;
		onValueChange?.(next);
		const s = toDateOnly(next);
		valueString = s;
		onValueStringChange?.(s);
	}

	function handleCalendarChange(next: DateValue | undefined) {
		value = next;
		handleValueChange(next);
		if (next) open = false;
	}

	function editableSegments(): HTMLElement[] {
		return [
			...(frame?.querySelectorAll<HTMLElement>('[data-segment]:not([data-segment="literal"])') ??
				[])
		];
	}

	// focus left the whole field (segments + calendar button): a partial entry is INCOMPLETE
	function handleFocusOut(e: FocusEvent) {
		if (open || (e.relatedTarget instanceof Node && frame?.contains(e.relatedTarget))) return;
		if (resolved.status === 'partial') {
			incomplete = true;
			onIncomplete?.();
		} else if (resolved.status === 'empty') incomplete = false;
	}

	// Alt+ArrowDown opens the calendar; captured so the focused segment never steps its value
	function handleKeyDownCapture(e: KeyboardEvent) {
		if (e.altKey && e.key === 'ArrowDown' && !disabled && !readonly) {
			e.preventDefault();
			e.stopPropagation();
			open = true;
		}
	}
</script>

<Field.Field class={className}>
	<DateField.Label
		id={`${fieldId}-label`}
		class={srLabel ? 'sr-only' : undefined}
		onclick={() => editableSegments()[0]?.focus()}
	>
		{label}
		{#if required}<Field.Required />{/if}
	</DateField.Label>

	<div
		bind:this={frame}
		class={cn(
			fieldControlClass,
			'gap-1 py-0 pe-1 has-[[data-segment]:focus-visible]:border-ring has-[[data-segment]:focus-visible]:ring-3 has-[[data-segment]:focus-visible]:ring-ring',
			'data-invalid:border-destructive',
			disabled && 'cursor-not-allowed bg-muted opacity-50'
		)}
		data-invalid={shownError ? '' : undefined}
		onfocusout={handleFocusOut}
	>
		<DateField.Input
			bind:this={input}
			id={fieldId}
			bind:value
			bind:resolved
			onChange={handleValueChange}
			{locale}
			{bounds}
			{minValue}
			{maxValue}
			{disabled}
			{readonly}
			{required}
			{describedBy}
			invalid={Boolean(shownError)}
			labelledBy={`${fieldId}-label`}
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
