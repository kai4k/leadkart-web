<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		showCloseButton = false,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		showCloseButton?: boolean;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="dialog-footer"
	class={cn('flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end', className)}
	{...restProps}
>
	{@render children?.()}
	{#if showCloseButton}
		<DialogPrimitive.Close>
			{#snippet child({ props })}
				<Button variant="secondary" {...props}>{$_('common.close')}</Button>
			{/snippet}
		</DialogPrimitive.Close>
	{/if}
</div>
