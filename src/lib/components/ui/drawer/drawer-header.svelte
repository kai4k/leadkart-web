<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="drawer-header"
	class={cn(
		'relative flex flex-col gap-1.5 px-5 pb-3 pe-14 pt-5',
		// The legacy Close button is a direct child: it sits in the header's inline-end corner, not under the title
		// (a minimal fix: the drawer is replaced by the form sheet in Phase 2).
		'[&>button]:absolute [&>button]:end-3 [&>button]:top-3 [&>button]:inline-flex [&>button]:min-h-6 [&>button]:min-w-6 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full',
		'[&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-ring [&>button]:focus-visible:outline-none',
		className
	)}
	{...rest}
>
	{@render children?.()}
</div>
