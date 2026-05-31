<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		type = 'text',
		...rest
	}: WithElementRef<HTMLInputAttributes> = $props();
</script>

<input
	bind:this={ref}
	bind:value
	data-slot="input"
	{type}
	class={cn(
		'flex h-10 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm',
		'placeholder:text-fg-subtle',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...rest}
/>
