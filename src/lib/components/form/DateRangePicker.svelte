<!-- src/lib/components/form/DateRangePicker.svelte -->
<!--
	DateRangePicker — a date range you can TYPE or PICK.

	Two segment groups, start and end, each in the business locale's order (en-IN: day / month / year); the groups are named
	"{label}, start date" and "{label}, end date". The keys are the DatePicker's (digits advance on their own, Up / Down
	step, Left / Right move, Backspace removes a digit; Alt+ArrowDown on any segment opens the calendar; Escape closes it).
	The calendar is `ui/range-calendar` in a popover with month and year dropdowns (default 1900 to ten years ahead;
	`minYear` / `maxYear`, or `minValue` / `maxValue`); Enter or Space picks the start, then the end, and the popover closes
	once both are set. PageUp / PageDown are NOT implemented by bits-ui.

	The value is `{ start, end }` of CALENDAR dates (bits-ui's DateRange contract; no time, no zone). `valueString` /
	`onValueStringChange` carry the same range as ISO `YYYY-MM-DD` strings; with `startName` / `endName` hidden inputs post
	them. Each side follows the DatePicker's rules: an impossible date (31 / 02 / 2026) stays as typed, is invalid on ITS side
	("The start date does not exist" / "The end date does not exist") and emits nothing; a half-typed year is not a value. An
	end before the start is invalid (`aria-invalid` on both groups, "The end date is before the start date"). When focus
	leaves the field with a start or an end half typed it calls `onIncomplete` and shows "Enter a complete start and end
	date" unless the caller passes an `error`.
-->
<script lang="ts" module>
	import type { DateValue } from '@internationalized/date';

	export type DateRange = {
		start: DateValue | undefined;
		end: DateValue | undefined;
	};
	/** The same range as ISO `YYYY-MM-DD` strings (`''` for none). */
	export type DateRangeString = { start: string; end: string };
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Calendar as CalendarIcon, Icon } from '#lib/icons/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as DateField from '#lib/components/ui/date-field/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { RangeCalendar } from '#lib/components/ui/range-calendar/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { fromDateOnly, toDateOnly } from '#lib/utils/date-only.ts';
	import { BUSINESS_LOCALE } from '#lib/utils/format.ts';
	import { yearBounds, type Resolved } from '#lib/utils/typed-date.ts';
	import { fieldControlClass } from './field-control.ts';

	type Props = {
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		value?: DateRange;
		onValueChange?: (value: DateRange) => void;
		valueString?: DateRangeString;
		onValueStringChange?: (value: DateRangeString) => void;
		/** Focus left the field with a start or an end half typed. */
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
		startName?: string;
		endName?: string;
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
		readonly = false,
		required = false,
		locale = BUSINESS_LOCALE,
		weekStartsOn = 0,
		minYear,
		maxYear,
		startName,
		endName,
		id,
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `daterange-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	let open = $state(false);
	let incomplete = $state(false);
	let frame: HTMLElement | undefined = $state();
	let startResolved = $state<Resolved>({ status: 'empty' });
	let endResolved = $state<Resolved>({ status: 'empty' });

	const bounds = $derived(
		yearBounds(minYear, maxYear, minValue, maxValue, new Date().getFullYear())
	);
	const years = $derived(
		Array.from({ length: Math.max(bounds.to - bounds.from + 1, 1) }, (_, i) => bounds.from + i)
	);

	const reversed = $derived(
		Boolean(value?.start && value?.end && value.end.compare(value.start) < 0)
	);
	// the error of one side: year range, does not exist, outside min / max
	function sideError(r: Resolved, notExist: string): string | null {
		if (r.status !== 'invalid') return null;
		if (r.reason === 'yearRange')
			return $_('form.datePicker.yearRange', { values: { min: bounds.from, max: bounds.to } });
		if (r.reason === 'notExist') return notExist;
		return $_('form.datePicker.outOfRange');
	}
	const startError = $derived(sideError(startResolved, $_('form.dateRangePicker.notExistStart')));
	const endError = $derived(sideError(endResolved, $_('form.dateRangePicker.notExistEnd')));
	const partial = $derived(startResolved.status === 'partial' || endResolved.status === 'partial');
	const shownError = $derived(
		error ??
			startError ??
			endError ??
			(reversed
				? $_('form.dateRangePicker.order')
				: incomplete && partial
					? $_('form.dateRangePicker.incomplete')
					: null)
	);
	const describedBy = $derived(
		[shownError ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
	// an end before the start, or a caller's error, marks both sides; an impossible date only its own
	const bothInvalid = $derived(Boolean(error) || reversed || (incomplete && partial));

	// a native post carries a range only when it is sound: no reversed range, no half-typed or impossible side
	const postable = $derived(
		!reversed &&
			![startResolved, endResolved].some((r) => r.status === 'partial' || r.status === 'invalid')
	);

	const strings = (r: DateRange | undefined): DateRangeString => ({
		start: toDateOnly(r?.start),
		end: toDateOnly(r?.end)
	});

	// the string side drives `value` when the caller changes it
	$effect(() => {
		if (!valueString) return;
		const now = strings(value);
		if (valueString.start !== now.start || valueString.end !== now.end)
			value = { start: fromDateOnly(valueString.start), end: fromDateOnly(valueString.end) };
	});

	function report(next: DateRange) {
		if (next.start && next.end) incomplete = false;
		onValueChange?.(next);
		const s = strings(next);
		valueString = s;
		onValueStringChange?.(s);
	}

	// one side's field changed by typing: it has already set its own half of `value` through the binding
	function handleSideChange() {
		report({ start: value?.start, end: value?.end });
	}

	function handleCalendarChange(next: DateRange) {
		value = next;
		report(next);
		if (next.start && next.end) open = false;
	}

	const editableSegments = () => [
		...(frame?.querySelectorAll<HTMLElement>('[data-segment]:not([data-segment="literal"])') ?? [])
	];

	// focus left the whole field: a partial start or end is INCOMPLETE
	function handleFocusOut(e: FocusEvent) {
		if (open || (e.relatedTarget instanceof Node && frame?.contains(e.relatedTarget))) return;
		if (partial) {
			incomplete = true;
			onIncomplete?.();
		} else if (startResolved.status === 'empty' && endResolved.status === 'empty')
			incomplete = false;
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
		onclick={() => editableSegments()[0]?.focus()}>{label}</DateField.Label
	>

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
			bind:value={() => value?.start, (v) => (value = { start: v, end: value?.end })}
			bind:resolved={startResolved}
			onChange={handleSideChange}
			{locale}
			{bounds}
			{minValue}
			{maxValue}
			{disabled}
			{readonly}
			{required}
			{describedBy}
			invalid={Boolean(startError) || bothInvalid}
			ariaLabel={$_('form.dateRangePicker.start', { values: { label } })}
			onkeydowncapture={handleKeyDownCapture}
		/>
		<span aria-hidden="true" class="px-1 text-muted-foreground">–</span>
		<DateField.Input
			bind:value={() => value?.end, (v) => (value = { start: value?.start, end: v })}
			bind:resolved={endResolved}
			onChange={handleSideChange}
			{locale}
			{bounds}
			{minValue}
			{maxValue}
			{disabled}
			{readonly}
			{required}
			{describedBy}
			invalid={Boolean(endError) || bothInvalid}
			ariaLabel={$_('form.dateRangePicker.end', { values: { label } })}
			onkeydowncapture={handleKeyDownCapture}
			class="flex-1"
		/>
		<Popover.Root bind:open>
			<Popover.Trigger disabled={disabled || readonly}>
				{#snippet child({ props })}
					<Button
						{...props}
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={$_('form.dateRangePicker.openCalendar', { values: { label } })}
					>
						<Icon icon={CalendarIcon} size="sm" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content align="end" class="w-auto p-0">
				<RangeCalendar
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

	{#if startName}
		<input type="hidden" name={startName} value={postable ? toDateOnly(value?.start) : ''} />
	{/if}
	{#if endName}
		<input type="hidden" name={endName} value={postable ? toDateOnly(value?.end) : ''} />
	{/if}

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if shownError}
		<Field.Error id={errorId}>{shownError}</Field.Error>
	{/if}
</Field.Field>
