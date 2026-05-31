<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { ChevronLeft, ChevronRight, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';
	type SingleProps = Extract<CalendarPrimitive.RootProps, { type?: 'single' }>;
	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(),
		placeholder = $bindable(),
		weekdayFormat = 'short',
		type: _type,
		...rest
	}: SingleProps = $props();
</script>

<CalendarPrimitive.Root
	bind:ref
	bind:value
	bind:placeholder
	type="single"
	{weekdayFormat}
	data-slot="calendar"
	class={cn('rounded-md border border-border bg-bg-elevated p-3', className)}
	{...rest}
>
	{#snippet children({ months, weekdays })}
		<CalendarPrimitive.Header class="flex items-center justify-between">
			<CalendarPrimitive.PrevButton
				class="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-bg-muted"
			>
				<Icon icon={ChevronLeft} size="sm" />
			</CalendarPrimitive.PrevButton>
			<CalendarPrimitive.Heading class="text-sm font-medium" />
			<CalendarPrimitive.NextButton
				class="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-bg-muted"
			>
				<Icon icon={ChevronRight} size="sm" />
			</CalendarPrimitive.NextButton>
		</CalendarPrimitive.Header>
		{#each months as month (month.value)}
			<CalendarPrimitive.Grid class="mt-3 w-full border-collapse space-y-1">
				<CalendarPrimitive.GridHead>
					<CalendarPrimitive.GridRow class="flex">
						{#each weekdays as day, i (i)}
							<CalendarPrimitive.HeadCell
								class="w-9 rounded-md text-[0.8rem] font-normal text-fg-muted"
							>
								{day.slice(0, 2)}
							</CalendarPrimitive.HeadCell>
						{/each}
					</CalendarPrimitive.GridRow>
				</CalendarPrimitive.GridHead>
				<CalendarPrimitive.GridBody>
					{#each month.weeks as weekDates (weekDates)}
						<CalendarPrimitive.GridRow class="mt-2 flex w-full">
							{#each weekDates as date (date)}
								<CalendarPrimitive.Cell {date} month={month.value} class="p-0">
									<CalendarPrimitive.Day
										class={cn(
											'inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-normal',
											'hover:bg-bg-muted',
											'data-[selected]:bg-primary data-[selected]:text-primary-fg',
											'data-[outside-month]:text-fg-subtle data-[outside-month]:opacity-50',
											'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none'
										)}
									/>
								</CalendarPrimitive.Cell>
							{/each}
						</CalendarPrimitive.GridRow>
					{/each}
				</CalendarPrimitive.GridBody>
			</CalendarPrimitive.Grid>
		{/each}
	{/snippet}
</CalendarPrimitive.Root>
