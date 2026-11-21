<script lang="ts">
	import { DateField as DateFieldPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils/cn.ts';

	/** The visible label; it names the segment group (aria-labelledby). Same look as `field/field-label`. */
	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DateFieldPrimitive.LabelProps = $props();
</script>

<DateFieldPrimitive.Label
	bind:ref
	data-slot="date-field-label"
	class={cn(
		'flex w-fit items-center gap-2 text-sm leading-snug font-medium select-none',
		className
	)}
	{...restProps}
/>
