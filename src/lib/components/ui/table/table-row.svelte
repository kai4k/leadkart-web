<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn(
		'hover:bg-muted data-[state=selected]:bg-muted border-b transition-colors has-aria-expanded:bg-muted',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>
