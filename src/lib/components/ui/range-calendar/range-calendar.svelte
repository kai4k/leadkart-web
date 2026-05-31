<script lang="ts">
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
	import { ChevronLeft, ChevronRight, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(),
		placeholder = $bindable(),
		weekdayFormat = 'short',
		...rest
	}: RangeCalendarPrimitive.RootProps = $props();
</script>

<RangeCalendarPrimitive.Root
	bind:ref
	bind:value
	bind:placeholder
	{weekdayFormat}
	data-slot="range-calendar"
	class={cn('rounded-md border border-border bg-bg-elevated p-3', className)}
	{...rest}
>
	{#snippet children({ months, weekdays })}
		<RangeCalendarPrimitive.Header class="flex items-center justify-between">
			<RangeCalendarPrimitive.PrevButton
				class="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-bg-muted"
			>
				<Icon icon={ChevronLeft} size="sm" />
			</RangeCalendarPrimitive.PrevButton>
			<RangeCalendarPrimitive.Heading class="text-sm font-medium" />
			<RangeCalendarPrimitive.NextButton
				class="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-bg-muted"
			>
				<Icon icon={ChevronRight} size="sm" />
			</RangeCalendarPrimitive.NextButton>
		</RangeCalendarPrimitive.Header>
		{#each months as month (month.value)}
			<RangeCalendarPrimitive.Grid class="mt-3 w-full border-collapse space-y-1">
				<RangeCalendarPrimitive.GridHead>
					<RangeCalendarPrimitive.GridRow class="flex">
						{#each weekdays as day, i (i)}
							<RangeCalendarPrimitive.HeadCell
								class="w-9 rounded-md text-[0.8rem] font-normal text-fg-muted"
							>
								{day.slice(0, 2)}
							</RangeCalendarPrimitive.HeadCell>
						{/each}
					</RangeCalendarPrimitive.GridRow>
				</RangeCalendarPrimitive.GridHead>
				<RangeCalendarPrimitive.GridBody>
					{#each month.weeks as weekDates (weekDates)}
						<RangeCalendarPrimitive.GridRow class="mt-2 flex w-full">
							{#each weekDates as date (date)}
								<RangeCalendarPrimitive.Cell {date} month={month.value} class="p-0">
									<RangeCalendarPrimitive.Day
										class={cn(
											'inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-normal',
											'hover:bg-bg-muted',
											'data-[selected]:bg-primary data-[selected]:text-primary-fg',
											'data-[range-middle]:bg-primary-soft',
											'data-[outside-month]:text-fg-subtle data-[outside-month]:opacity-50',
											'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none'
										)}
									/>
								</RangeCalendarPrimitive.Cell>
							{/each}
						</RangeCalendarPrimitive.GridRow>
					{/each}
				</RangeCalendarPrimitive.GridBody>
			</RangeCalendarPrimitive.Grid>
		{/each}
	{/snippet}
</RangeCalendarPrimitive.Root>
