<script lang="ts">
	import { DateField as DateFieldPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * One segment (day, month, year or a literal `/`). The editable ones are `role="spinbutton"` with tabindex 0:
	 * digits type (and auto-advance), Up/Down step, Left/Right move, Backspace clears. Empty segments show the
	 * placeholder letters in the muted colour.
	 */
	let {
		ref = $bindable(null),
		class: className,
		part,
		...restProps
	}: DateFieldPrimitive.SegmentProps = $props();
</script>

<DateFieldPrimitive.Segment
	bind:ref
	{part}
	data-slot="date-field-segment"
	class={cn(
		// 24 x 24 at least (WCAG 2.5.8 target size): a two-digit day is narrower than that
		'inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm px-0.5 tabular-nums caret-transparent outline-none',
		'focus:bg-accent focus:text-accent-foreground',
		'data-[segment=literal]:min-w-0 data-[segment=literal]:px-0 data-placeholder:text-muted-foreground',
		className
	)}
	{...restProps}
/>
