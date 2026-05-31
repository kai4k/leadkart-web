<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...rest
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { inset?: boolean } = $props();
</script>

<div
	bind:this={ref}
	data-slot="dropdown-menu-label"
	class={cn('px-2 py-1.5 text-sm font-semibold text-fg', inset && 'pl-8', className)}
	{...rest}
>
	{@render children?.()}
</div>
