<script lang="ts">
	import { DateRangeField as DateRangeFieldPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils/cn.ts';

	/** The visible label of the range; the start and end groups are named from it. Same look as `date-field-label`. */
	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DateRangeFieldPrimitive.LabelProps = $props();
</script>

<DateRangeFieldPrimitive.Label
	bind:ref
	data-slot="date-range-field-label"
	class={cn(
		'flex w-fit items-center gap-2 text-sm leading-snug font-medium select-none',
		className
	)}
	{...restProps}
/>
