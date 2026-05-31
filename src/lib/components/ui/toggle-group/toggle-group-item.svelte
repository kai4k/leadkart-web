<script lang="ts">
	import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
	import { getContext } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import { toggleVariants, type ToggleVariants } from '../toggle';
	let {
		ref = $bindable(null),
		class: className,
		variant,
		size,
		...rest
	}: ToggleGroupPrimitive.ItemProps & ToggleVariants = $props();

	const ctx = getContext<ToggleVariants>('toggle-group');
</script>

<ToggleGroupPrimitive.Item
	bind:ref
	data-slot="toggle-group-item"
	class={cn(
		toggleVariants({
			variant: variant ?? ctx?.variant ?? 'default',
			size: size ?? ctx?.size ?? 'default'
		}),
		className
	)}
	{...rest}
/>
