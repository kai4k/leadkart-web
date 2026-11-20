<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from '#lib/utils/cn.ts';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		'data-slot': dataSlot = 'textarea',
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		'border-input dark:bg-input-fill focus-visible:border-ring focus-visible:ring-ring   aria-invalid:border-destructive  disabled:bg-muted dark:disabled:bg-muted rounded-md border bg-transparent px-4 py-2 text-base transition-colors focus-visible:ring-3  md:text-sm flex min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	bind:value
	{...restProps}
></textarea>
