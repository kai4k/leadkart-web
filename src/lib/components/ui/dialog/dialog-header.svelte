<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="dialog-header"
	class={cn('flex flex-col gap-1.5 px-5 pt-5 pb-3', className)}
	{...restProps}
>
	{@render children?.()}
</div>
