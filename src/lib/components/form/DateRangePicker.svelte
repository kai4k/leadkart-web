<!-- src/lib/components/form/DateRangePicker.svelte -->
<!--
	DateRangePicker — date-range picker on `ui/popover` + `ui/range-calendar`.

	The field is a button named by the visible label AND the chosen range (`aria-labelledby`); it
	opens a popover with the range month grid. The caption has month and year dropdowns (default 1900
	to ten years ahead; `minYear` / `maxYear`, or `minValue` / `maxValue`). bits-ui's range calendar
	handles the semantics and the keyboard: arrow keys move between days, Enter or Space picks the
	start, then the end; Escape closes. PageUp/PageDown are NOT implemented by bits-ui. The popover
	closes once both ends are chosen.

	The value is `{ start, end }` (bits-ui's DateRange contract). With `startName` / `endName`,
	hidden inputs carry the ISO dates for native form submission.
-->
<script lang="ts" module>
	import { DateFormatter, getLocalTimeZone, type DateValue } from '@internationalized/date';

	export type DateRange = {
		start: DateValue | undefined;
		end: DateValue | undefined;
	};
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Calendar as CalendarIcon, Icon } from '#lib/icons/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { RangeCalendar } from '#lib/components/ui/range-calendar/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { fieldControlClass } from './field-control.ts';

	type Props = {
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		value?: DateRange;
		onValueChange?: (value: DateRange) => void;
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
		placeholder,
		minValue,
		maxValue,
		disabled = false,
		required = false,
		readonly = false,
		locale = 'en',
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
	const labelId = $derived(`${fieldId}-label`);
	const valueId = $derived(`${fieldId}-value`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
	);

	let open = $state(false);

	const years = $derived.by(() => {
		const from = minYear ?? minValue?.year ?? 1900;
		const to = maxYear ?? maxValue?.year ?? new Date().getFullYear() + 10;
		return Array.from({ length: Math.max(to - from + 1, 1) }, (_, i) => from + i);
	});

	const formatter = $derived(new DateFormatter(locale, { dateStyle: 'medium' }));
	const fmt = (d: DateValue | undefined) =>
		d ? formatter.format(d.toDate(getLocalTimeZone())) : '';
	const text = $derived(
		value?.start ? `${fmt(value.start)} – ${value.end ? fmt(value.end) : '…'}` : ''
	);

	function handleValueChange(next: DateRange) {
		onValueChange?.(next);
		if (next.start && next.end) open = false;
	}
</script>

<Field.Field class={className}>
	<Field.Label id={labelId} for={fieldId} class={srLabel ? 'sr-only' : undefined}
		>{label}</Field.Label
	>

	<Popover.Root bind:open>
		<Popover.Trigger
			id={fieldId}
			disabled={disabled || readonly}
			aria-labelledby="{labelId} {valueId}"
			aria-required={required ? 'true' : undefined}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			class={cn(fieldControlClass, 'justify-between gap-2 text-start')}
		>
			<span id={valueId} class={cn('truncate', !text && 'text-muted-foreground')}>
				{text || $_('form.dateRangePicker.placeholder')}
			</span>
			<Icon icon={CalendarIcon} size="sm" class="shrink-0 text-muted-foreground" />
		</Popover.Trigger>

		<Popover.Content align="start" class="w-auto p-0">
			<RangeCalendar
				bind:value
				onValueChange={handleValueChange}
				{placeholder}
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

	{#if startName}
		<input type="hidden" name={startName} value={value?.start?.toString() ?? ''} />
	{/if}
	{#if endName}
		<input type="hidden" name={endName} value={value?.end?.toString() ?? ''} />
	{/if}

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{/if}
</Field.Field>
