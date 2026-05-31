<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...rest
	}: WithElementRef<HTMLTextareaAttributes> = $props();
</script>

<textarea
	bind:this={ref}
	bind:value
	data-slot="textarea"
	class={cn(
		'flex min-h-[80px] w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm',
		'placeholder:text-fg-subtle',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...rest}
></textarea>
