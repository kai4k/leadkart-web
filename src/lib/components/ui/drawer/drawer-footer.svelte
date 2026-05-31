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
	data-slot="drawer-footer"
	class={cn('mt-auto flex flex-col-reverse gap-2 border-t border-border px-5 py-4', className)}
	{...rest}
>
	{@render children?.()}
</div>
