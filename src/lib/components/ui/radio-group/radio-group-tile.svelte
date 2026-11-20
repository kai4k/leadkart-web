<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils/cn.ts';

	/**
	 * LeadKart addition (ui/CUSTOMIZATIONS.md): a radio that is a whole tile (a preview plus its
	 * label), not a circle. Same primitive, same roving focus and `aria-checked`; the focus ring is
	 * the usual one and the checked look is the caller's (`group-aria-checked/tile:`).
	 */
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: RadioGroupPrimitive.ItemProps = $props();
</script>

<RadioGroupPrimitive.Item
	bind:ref
	data-slot="radio-group-tile"
	class={cn(
		'group/tile flex min-w-0 cursor-pointer flex-col items-stretch gap-2 rounded-lg text-start outline-none',
		'focus-visible:ring-ring focus-visible:ring-offset-popover focus-visible:ring-3 focus-visible:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{children}
	{...restProps}
/>
