<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<kbd
	bind:this={ref}
	data-slot="kbd"
	class={cn(
		'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-bg-muted px-1 font-mono text-[10px] font-medium text-fg-muted',
		className
	)}
	{...rest}
>
	{@render children?.()}
</kbd>
