<!-- src/lib/components/form/DateRangePicker.svelte -->
<!--
	DateRangePicker — date-range picker over bits-ui DateRangePicker.

	bits-ui composes DateRangeField (two segmented inputs — start +
	end), Popover (calendar dropdown), and RangeCalendar (range-aware
	month grid). ARIA wiring + range-selection keyboard nav handled
	by bits-ui.

	Visual: dual-segment input with an en-dash separator, calendar
	icon trigger, popover-hosted range calendar with primary-soft
	fill for the range body + primary fill for the endpoints.

	Value shape is `{ start, end }` per bits-ui's DateRange contract.
-->
<script lang="ts">
	import { DateRangePicker as BitsDateRangePicker, type SegmentPart } from 'bits-ui';
	import type { DateValue } from '@internationalized/date';
	import { Calendar, ChevronLeft, ChevronRight, Icon } from '$lib/icons';
	import { cn } from '$lib/utils/cn';

	export type DateRange = {
		start: DateValue | undefined;
		end: DateValue | undefined;
	};

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
		startName,
		endName,
		id,
		class: className = ''
	}: Props = $props();

	const fieldId = $derived(id ?? `daterange-${label.toLowerCase().replace(/\s+/g, '-')}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);

	const segmentClass =
		'rounded px-0.5 text-fg focus-visible:outline-none focus-visible:bg-brand-50 focus-visible:text-brand-600 data-[placeholder]:text-fg-subtle';
</script>

<div class={cn('stack stack-tight', className)}>
	<label for={fieldId} class={cn('label text-fg', srLabel && 'sr-only')}>
		{label}
	</label>

	<BitsDateRangePicker.Root
		bind:value
		{onValueChange}
		{placeholder}
		{minValue}
		{maxValue}
		{disabled}
		{required}
		{readonly}
		{locale}
		{weekStartsOn}
	>
		<div
			class={cn(
				'bg-bg-elevated border border-border rounded-md text-fg relative flex w-full items-center gap-1 px-3 py-2 pe-10',
				'body-sm focus-within:ring-focus-ring focus-within:ring-2 focus-within:ring-offset-1',
				'disabled:cursor-not-allowed disabled:opacity-60',
				error && 'border-danger-500 focus-within:ring-danger-500'
			)}
			aria-describedby={describedBy}
		>
			<BitsDateRangePicker.Input type="start" name={startName} class="flex items-center gap-px">
				{#snippet children({ segments }: { segments: Array<{ part: SegmentPart; value: string }> })}
					{#each segments as { part, value: segValue } (part)}
						{#if part === 'literal'}
							<BitsDateRangePicker.Segment {part} class="text-fg-subtle">
								{segValue}
							</BitsDateRangePicker.Segment>
						{:else}
							<BitsDateRangePicker.Segment {part} class={segmentClass}>
								{segValue}
							</BitsDateRangePicker.Segment>
						{/if}
					{/each}
				{/snippet}
			</BitsDateRangePicker.Input>
			<span class="text-fg-subtle px-1" aria-hidden="true">–</span>
			<BitsDateRangePicker.Input type="end" name={endName} class="flex items-center gap-px">
				{#snippet children({ segments }: { segments: Array<{ part: SegmentPart; value: string }> })}
					{#each segments as { part, value: segValue } (part)}
						{#if part === 'literal'}
							<BitsDateRangePicker.Segment {part} class="text-fg-subtle">
								{segValue}
							</BitsDateRangePicker.Segment>
						{:else}
							<BitsDateRangePicker.Segment {part} class={segmentClass}>
								{segValue}
							</BitsDateRangePicker.Segment>
						{/if}
					{/each}
				{/snippet}
			</BitsDateRangePicker.Input>
			<BitsDateRangePicker.Trigger
				id={fieldId}
				class={cn(
					'text-fg-subtle absolute inset-y-0 end-0 flex items-center pe-3',
					'hover:text-fg transition-colors',
					'focus-visible:outline-none'
				)}
				aria-label="Open calendar"
			>
				<Icon icon={Calendar} size="sm" />
			</BitsDateRangePicker.Trigger>
		</div>

		<BitsDateRangePicker.Content
			sideOffset={6}
			class={cn(
				'bg-bg-elevated border border-border rounded-xl shadow-card z-popover rounded-xl p-3',
				'border border-[var(--glass-border-subtle)]',
				'shadow-[var(--glass-shadow-sm)]',
				'data-[state=open]:animate-pop-in data-[state=closed]:animate-fade-out'
			)}
		>
			<BitsDateRangePicker.Calendar class="w-fit">
				{#snippet children({ months, weekdays })}
					<BitsDateRangePicker.Header class="mb-2 flex items-center justify-between">
						<BitsDateRangePicker.PrevButton
							class={cn(
								'inline-flex size-7 items-center justify-center rounded-md',
								'text-fg-muted hover:bg-bg-muted hover:text-fg',
								'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none'
							)}
							aria-label="Previous month"
						>
							<Icon icon={ChevronLeft} size="sm" />
						</BitsDateRangePicker.PrevButton>
						<BitsDateRangePicker.Heading class="body-sm text-fg font-medium" />
						<BitsDateRangePicker.NextButton
							class={cn(
								'inline-flex size-7 items-center justify-center rounded-md',
								'text-fg-muted hover:bg-bg-muted hover:text-fg',
								'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none'
							)}
							aria-label="Next month"
						>
							<Icon icon={ChevronRight} size="sm" />
						</BitsDateRangePicker.NextButton>
					</BitsDateRangePicker.Header>
					{#each months as month (month.value)}
						<BitsDateRangePicker.Grid class="w-full border-collapse">
							<BitsDateRangePicker.GridHead>
								<BitsDateRangePicker.GridRow class="flex">
									{#each weekdays as day (day)}
										<BitsDateRangePicker.HeadCell
											class="text-fg-subtle caption flex size-8 items-center justify-center font-normal"
										>
											{day}
										</BitsDateRangePicker.HeadCell>
									{/each}
								</BitsDateRangePicker.GridRow>
							</BitsDateRangePicker.GridHead>
							<BitsDateRangePicker.GridBody>
								{#each month.weeks as weekDates (weekDates[0].toString())}
									<BitsDateRangePicker.GridRow class="flex w-full">
										{#each weekDates as date (date.toString())}
											<BitsDateRangePicker.Cell
												{date}
												month={month.value}
												class={cn(
													'relative size-8 p-0 text-center',
													// Inside-range visual: primary-soft band; rounded only at the row edges.
													'data-[selected]:bg-brand-50',
													'data-[range-end]:rounded-r-md data-[range-start]:rounded-l-md'
												)}
											>
												<BitsDateRangePicker.Day
													class={cn(
														'inline-flex size-8 items-center justify-center rounded-md',
														'body-sm text-fg',
														'hover:bg-bg-muted',
														'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none',
														'data-[outside-month]:text-fg-subtle data-[outside-month]:pointer-events-none',
														'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
														'data-[unavailable]:text-fg-subtle data-[unavailable]:line-through',
														// Range endpoints — solid primary fill.
														'data-[selection-start]:bg-primary data-[selection-start]:text-primary-fg',
														'data-[selection-end]:bg-primary data-[selection-end]:text-primary-fg',
														'data-[today]:ring-primary data-[today]:ring-1 data-[today]:ring-inset'
													)}
												/>
											</BitsDateRangePicker.Cell>
										{/each}
									</BitsDateRangePicker.GridRow>
								{/each}
							</BitsDateRangePicker.GridBody>
						</BitsDateRangePicker.Grid>
					{/each}
				{/snippet}
			</BitsDateRangePicker.Calendar>
		</BitsDateRangePicker.Content>
	</BitsDateRangePicker.Root>

	{#if hint && !error}
		<p id={hintId} class="caption">{hint}</p>
	{/if}

	{#if error}
		<p id={errorId} class="body-sm text-danger-700">{error}</p>
	{/if}
</div>
