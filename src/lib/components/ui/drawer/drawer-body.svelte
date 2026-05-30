<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="drawer-body"
	class={cn('flex-1 overflow-y-auto px-5 py-5', className)}
	{...rest}
>
	{@render children?.()}
</div>
