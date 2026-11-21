<!-- src/lib/components/form/DateRangePicker.svelte -->
<!--
	DateRangePicker — a date range you can TYPE or PICK.

	Two segment groups, start and end, each in the business locale's order (en-IN: day / month / year); the groups are named
	"{label}, start date" and "{label}, end date". The keys are the DatePicker's (digits advance on their own, Up / Down
	step, Left / Right move, Backspace clears; Alt+ArrowDown on any segment opens the calendar; Escape closes it). The calendar
	is `ui/range-calendar` in a popover with month and year dropdowns (default 1900 to ten years ahead; `minYear` / `maxYear`,
	or `minValue` / `maxValue`); Enter or Space picks the start, then the end, and the popover closes once both are set.
	PageUp / PageDown are NOT implemented by bits-ui.

	The value is `{ start, end }` of CALENDAR dates (bits-ui's DateRange contract; no time, no zone). `valueString` /
	`onValueStringChange` carry the same range as ISO `YYYY-MM-DD` strings; with `startName` / `endName` hidden inputs post
	them. An end before the start is invalid (`aria-invalid` on both groups, "The end date is before the start date"). When
	focus leaves the field with a start or an end half typed it calls `onIncomplete` and shows "Enter a complete start and end
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
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { Calendar as CalendarIcon, Icon } from '#lib/icons/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as DateRangeField from '#lib/components/ui/date-range-field/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { RangeCalendar } from '#lib/components/ui/range-calendar/index.ts';
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
		required = false,
		readonly = false,
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
	let fieldPlaceholder = $state(untrack(() => placeholder) ?? typedFieldPlaceholder());
	let incomplete = $state(false);
	let frame: HTMLElement | undefined = $state();

	const reversed = $derived(
		Boolean(value?.start && value?.end && value.end.compare(value.start) < 0)
	);
	const shownError = $derived(
		error ??
			(reversed
				? $_('form.dateRangePicker.order')
				: incomplete
					? $_('form.dateRangePicker.incomplete')
					: null)
	);
	const describedBy = $derived(
		[shownError ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);

	const years = $derived.by(() => {
		const from = minYear ?? minValue?.year ?? 1900;
		const to = maxYear ?? maxValue?.year ?? new Date().getFullYear() + 10;
		return Array.from({ length: Math.max(to - from + 1, 1) }, (_, i) => from + i);
	});

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

	const startDay = createTypedDay();
	const endDay = createTypedDay();

	function handleValueChange(range: DateRange | undefined) {
		const typed = range ?? { start: undefined, end: undefined };
		const next = { start: startDay.restore(typed.start), end: endDay.restore(typed.end) };
		if (next.start !== typed.start || next.end !== typed.end) value = next;
		if (next.start && next.end) incomplete = false;
		onValueChange?.(next);
		const s = strings(next);
		valueString = s;
		onValueStringChange?.(s);
	}

	function handleCalendarChange(next: DateRange) {
		handleValueChange(next);
		if (next.start && next.end) open = false;
	}

	// focus left the whole field: a half-typed start or end (some, but not all, segments of a group) is INCOMPLETE
	function handleFocusOut(e: FocusEvent) {
		if (open || (e.relatedTarget instanceof Node && frame?.contains(e.relatedTarget))) return;
		const groups = [
			...(frame?.querySelectorAll<HTMLElement>('[data-slot="date-range-field-input"]') ?? [])
		];
		let half = false;
		let anyFilled = false;
		for (const g of groups) {
			const segs = [
				...g.querySelectorAll<HTMLElement>('[data-segment]:not([data-segment="literal"])')
			];
			const filled = segs.filter((s) => s.getAttribute('aria-valuetext') !== 'Empty').length;
			if (filled > 0) anyFilled = true;
			if (filled > 0 && filled < segs.length) half = true;
		}
		const complete = Boolean(value?.start && value?.end);
		if (half || (anyFilled && !complete && !(value?.start || value?.end))) {
			incomplete = true;
			onIncomplete?.();
		} else if (!anyFilled || complete) incomplete = false;
	}

	function captureKeys(day: ReturnType<typeof createTypedDay>) {
		return (e: KeyboardEvent) => {
			day.capture(e);
			handleKeyDownCapture(e);
		};
	}

	function handleKeyDownCapture(e: KeyboardEvent) {
		if (e.altKey && e.key === 'ArrowDown' && !disabled && !readonly) {
			e.preventDefault();
			e.stopPropagation();
			open = true;
		}
	}
</script>

<Field.Field class={className}>
	<DateRangeField.Root
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
		<DateRangeField.Label class={srLabel ? 'sr-only' : undefined}>{label}</DateRangeField.Label>

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
			<DateRangeField.Input
				id={fieldId}
				type="start"
				invalid={Boolean(shownError)}
				{describedBy}
				ariaLabel={$_('form.dateRangePicker.start', { values: { label } })}
				onkeydowncapture={captureKeys(startDay)}
			/>
			<span aria-hidden="true" class="px-1 text-muted-foreground">–</span>
			<DateRangeField.Input
				type="end"
				invalid={Boolean(shownError)}
				{describedBy}
				ariaLabel={$_('form.dateRangePicker.end', { values: { label } })}
				onkeydowncapture={captureKeys(endDay)}
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
	</DateRangeField.Root>

	{#if startName}
		<input type="hidden" name={startName} value={toDateOnly(value?.start)} />
	{/if}
	{#if endName}
		<input type="hidden" name={endName} value={toDateOnly(value?.end)} />
	{/if}

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if shownError}
		<Field.Error id={errorId}>{shownError}</Field.Error>
	{/if}
</Field.Field>
