<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CalendarPrimitive.DayProps = $props();
</script>

<CalendarPrimitive.Day
	bind:ref
	class={cn(
		'flex size-(--cell-size) flex-col items-center justify-center gap-1 rounded-(--cell-radius) p-0 leading-none font-normal whitespace-nowrap select-none',
		'[&:last-child[data-selected=true]_button]:rounded-e-(--cell-radius)',
		'not-data-selected:hover:bg-accent not-data-selected:hover:text-accent-foreground',
		'[&[data-today]:not([data-selected])]:ring-1 [&[data-today]:not([data-selected])]:ring-inset [&[data-today]:not([data-selected])]:ring-ring [&[data-today][data-disabled]]:text-muted-foreground',
		'data-[selected]:bg-primary data-[selected]:text-primary-foreground',
		// Outside months
		'[&[data-outside-month]:not([data-selected])]:text-muted-foreground [&[data-outside-month]:not([data-selected])]:hover:text-accent-foreground',
		// Disabled
		'data-[disabled]:pointer-events-none data-[disabled]:text-muted-foreground data-[disabled]:opacity-50',
		// Unavailable
		'data-[unavailable]:text-muted-foreground data-[unavailable]:line-through',
		// focus
		'focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
		// inner spans
		'[&>span]:text-xs',
		className
	)}
	{...restProps}
/>
