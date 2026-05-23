<!-- src/lib/components/form/DatePicker.svelte -->
<!--
	DatePicker — single-date picker over bits-ui DatePicker.

	bits-ui composes DateField (segmented input — DD/MM/YYYY parts with
	per-segment keyboard nav), Popover (calendar dropdown), and Calendar
	(month grid) into one accessible primitive. ARIA wiring + keyboard
	nav (arrow keys to move between segments + days, PageUp/Down for
	months, etc.) is fully handled by bits-ui.

	Visual: segmented input that mirrors TextField styling; calendar
	icon trigger anchored to the right edge; popover hosts a token-styled
	month grid with primary-coloured selected/today states.

	Uses @internationalized/date — the consumer passes `CalendarDate`
	(or any `DateValue`) and receives `DateValue | undefined` callbacks.
-->
<script lang="ts">
	import { DatePicker as BitsDatePicker, type SegmentPart } from 'bits-ui';
	import type { DateValue } from '@internationalized/date';
	import { Calendar, ChevronLeft, ChevronRight } from '$lib/icons';
	import { cn } from '$lib/utils/cn';

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

	const fieldId = $derived(id ?? `datepicker-${label.toLowerCase().replace(/\s+/g, '-')}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={cn('stack stack-tight', className)}>
	<label for={fieldId} class={cn('label text-fg', srLabel && 'sr-only')}>
		{label}
	</label>

	<BitsDatePicker.Root
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
		<div class="relative">
			<BitsDatePicker.Input
				{name}
				class={cn(
					'glass-input body-sm text-fg flex w-full items-center gap-px px-3 py-2 pr-10',
					'focus-visible:outline-none',
					'disabled:cursor-not-allowed disabled:opacity-60',
					'data-[invalid]:border-danger-500',
					error && 'border-danger-500'
				)}
				aria-describedby={describedBy}
			>
				{#snippet children({ segments }: { segments: Array<{ part: SegmentPart; value: string }> })}
					{#each segments as { part, value: segValue } (part)}
						{#if part === 'literal'}
							<BitsDatePicker.Segment {part} class="text-fg-subtle"
								>{segValue}</BitsDatePicker.Segment
							>
						{:else}
							<BitsDatePicker.Segment
								{part}
								class={cn(
									'text-fg rounded px-0.5',
									'focus-visible:bg-brand-50 focus-visible:text-brand-600 focus-visible:outline-none',
									'data-[placeholder]:text-fg-subtle'
								)}
							>
								{segValue}
							</BitsDatePicker.Segment>
						{/if}
					{/each}
				{/snippet}
			</BitsDatePicker.Input>
			<BitsDatePicker.Trigger
				id={fieldId}
				class={cn(
					'text-fg-subtle absolute inset-y-0 right-0 flex items-center pr-3',
					'hover:text-fg transition-colors',
					'focus-visible:outline-none'
				)}
				aria-label="Open calendar"
			>
				<Calendar size={16} />
			</BitsDatePicker.Trigger>
		</div>

		<BitsDatePicker.Content
			sideOffset={6}
			class={cn(
				'glass-card z-popover rounded-xl p-3',
				'border border-[var(--glass-border-subtle)]',
				'shadow-[var(--glass-shadow-sm)]',
				'data-[state=open]:animate-pop-in data-[state=closed]:animate-fade-out'
			)}
		>
			<BitsDatePicker.Calendar class="w-fit">
				{#snippet children({ months, weekdays })}
					<BitsDatePicker.Header class="mb-2 flex items-center justify-between">
						<BitsDatePicker.PrevButton
							class={cn(
								'inline-flex size-7 items-center justify-center rounded-md',
								'text-fg-muted hover:bg-bg-muted hover:text-fg',
								'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none'
							)}
							aria-label="Previous month"
						>
							<ChevronLeft size={16} />
						</BitsDatePicker.PrevButton>
						<BitsDatePicker.Heading class="body-sm text-fg font-medium" />
						<BitsDatePicker.NextButton
							class={cn(
								'inline-flex size-7 items-center justify-center rounded-md',
								'text-fg-muted hover:bg-bg-muted hover:text-fg',
								'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none'
							)}
							aria-label="Next month"
						>
							<ChevronRight size={16} />
						</BitsDatePicker.NextButton>
					</BitsDatePicker.Header>
					{#each months as month (month.value)}
						<BitsDatePicker.Grid class="w-full border-collapse">
							<BitsDatePicker.GridHead>
								<BitsDatePicker.GridRow class="flex">
									{#each weekdays as day (day)}
										<BitsDatePicker.HeadCell
											class="text-fg-subtle caption flex size-8 items-center justify-center font-normal"
										>
											{day}
										</BitsDatePicker.HeadCell>
									{/each}
								</BitsDatePicker.GridRow>
							</BitsDatePicker.GridHead>
							<BitsDatePicker.GridBody>
								{#each month.weeks as weekDates (weekDates[0].toString())}
									<BitsDatePicker.GridRow class="flex w-full">
										{#each weekDates as date (date.toString())}
											<BitsDatePicker.Cell
												{date}
												month={month.value}
												class="relative size-8 p-0 text-center"
											>
												<BitsDatePicker.Day
													class={cn(
														'inline-flex size-8 items-center justify-center rounded-md',
														'body-sm text-fg',
														'hover:bg-bg-muted',
														'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none',
														'data-[outside-month]:text-fg-subtle data-[outside-month]:pointer-events-none',
														'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
														'data-[unavailable]:text-fg-subtle data-[unavailable]:line-through',
														'data-[selected]:bg-primary data-[selected]:text-primary-fg data-[selected]:hover:bg-primary-hover',
														'data-[today]:ring-primary data-[today]:ring-1 data-[today]:ring-inset'
													)}
												/>
											</BitsDatePicker.Cell>
										{/each}
									</BitsDatePicker.GridRow>
								{/each}
							</BitsDatePicker.GridBody>
						</BitsDatePicker.Grid>
					{/each}
				{/snippet}
			</BitsDatePicker.Calendar>
		</BitsDatePicker.Content>
	</BitsDatePicker.Root>

	{#if hint && !error}
		<p id={hintId} class="caption">{hint}</p>
	{/if}

	{#if error}
		<p id={errorId} class="body-sm text-danger-700">{error}</p>
	{/if}
</div>
