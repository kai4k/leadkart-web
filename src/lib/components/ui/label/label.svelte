<script lang="ts">
	import type { HTMLLabelAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: WithElementRef<HTMLLabelAttributes> = $props();
</script>

<label
	bind:this={ref}
	data-slot="label"
	class={cn(
		'text-sm font-medium leading-none text-fg peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
		className
	)}
	{...rest}
>
	{@render children?.()}
</label>
