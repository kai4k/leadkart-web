<script lang="ts">
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: RangeCalendarPrimitive.DayProps = $props();
</script>

<RangeCalendarPrimitive.Day
	bind:ref
	class={cn(
		'flex size-(--cell-size) flex-col items-center justify-center gap-1 rounded-(--cell-radius) p-0 leading-none font-normal whitespace-nowrap select-none',
		'not-data-selected:hover:bg-accent not-data-selected:hover:text-accent-foreground',
		'data-[range-middle]:rounded-none [&[data-today]:not([data-selected])]:ring-1 [&[data-today]:not([data-selected])]:ring-inset [&[data-today]:not([data-selected])]:ring-ring [&[data-today][data-disabled]]:text-muted-foreground',
		// range Start
		'data-[range-start]:bg-primary data-[range-start]:text-primary-foreground',
		// range End
		'data-[range-end]:bg-primary data-[range-end]:text-primary-foreground',
		// Outside months
		'[&[data-outside-month]:not([data-selected])]:text-muted-foreground [&[data-outside-month]:not([data-selected])]:hover:text-accent-foreground',
		// Disabled
		'data-[disabled]:pointer-events-none data-[disabled]:text-muted-foreground data-[disabled]:opacity-50',
		// Unavailable
		'data-[unavailable]:line-through',
		'data-[range-middle]:hover:ring-1 data-[range-middle]:hover:ring-inset data-[range-middle]:hover:ring-ring',
		// focus
		'focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
		// inner spans
		'[&>span]:text-xs',
		className
	)}
	{...restProps}
/>
