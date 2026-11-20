<!-- src/lib/components/form/DatePicker.svelte -->
<!--
	DatePicker — single-date picker on `ui/popover` + `ui/calendar`.

	The field is a button (named by the visible label) showing the formatted date or a placeholder;
	it opens a popover with the month grid. bits-ui's calendar handles the grid semantics and the
	keyboard: arrow keys move between days, PageUp/PageDown change month, Home/End move within the
	week, Enter or Space selects, Escape closes. Picking a day closes the popover.

	Uses @internationalized/date: the consumer passes a `CalendarDate` (or any `DateValue`) and
	receives `DateValue | undefined` in `onValueChange`. With a `name`, a hidden input carries the
	ISO date (`2026-11-20`) for native form submission.
-->
<script lang="ts">
	import { DateFormatter, getLocalTimeZone, type DateValue } from '@internationalized/date';
	import { Calendar as CalendarIcon, Icon } from '#lib/icons/index.ts';
	import { Calendar } from '#lib/components/ui/calendar/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { fieldControlClass } from './field-control.ts';

	type Props = {
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		value?: DateValue;
		onValueChange?: (value: DateValue | undefined) => void;
		placeholder?: DateValue;
		minValue?: DateValue;
		maxValue?: DateValue;
		disabled?: boolean;
		required?: boolean;
		readonly?: boolean;
		locale?: string;
		weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
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
		placeholder,
		minValue,
		maxValue,
		disabled = false,
		required = false,
		readonly = false,
		locale = 'en',
		weekStartsOn = 0,
		name,
		id,
		class: className = ''
	}: Props = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? `datepicker-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
	);

	let open = $state(false);

	const formatter = $derived(new DateFormatter(locale, { dateStyle: 'medium' }));
	const text = $derived(value ? formatter.format(value.toDate(getLocalTimeZone())) : '');

	function handleValueChange(next: DateValue | undefined) {
		onValueChange?.(next);
		if (next) open = false;
	}
</script>

<Field.Field class={className}>
	<Field.Label for={fieldId} class={srLabel ? 'sr-only' : undefined}>{label}</Field.Label>

	<Popover.Root bind:open>
		<Popover.Trigger
			id={fieldId}
			disabled={disabled || readonly}
			aria-required={required ? 'true' : undefined}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			class={cn(fieldControlClass, 'justify-between gap-2 text-start')}
		>
			<span class={cn('truncate', !text && 'text-muted-foreground')}>{text || 'Pick a date'}</span>
			<Icon icon={CalendarIcon} size="sm" class="shrink-0 text-muted-foreground" />
		</Popover.Trigger>

		<Popover.Content align="start" class="w-auto p-0">
			<Calendar
				type="single"
				bind:value
				onValueChange={handleValueChange}
				{placeholder}
				{minValue}
				{maxValue}
				{locale}
				{weekStartsOn}
				{disabled}
				{readonly}
				aria-label={label}
			/>
		</Popover.Content>
	</Popover.Root>

	{#if name}
		<input type="hidden" {name} value={value?.toString() ?? ''} />
	{/if}

	{#if hint}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{/if}

	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{/if}
</Field.Field>
