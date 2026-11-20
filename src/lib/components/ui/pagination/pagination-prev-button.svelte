<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import { ChevronLeft as ChevronLeftIcon } from '#lib/icons/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { buttonVariants } from '../button/index.ts';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: PaginationPrimitive.PrevButtonProps = $props();
</script>

{#snippet Fallback()}
	<ChevronLeftIcon class={cn('rtl:rotate-180 size-4', className)} />
	<span>Previous</span>
{/snippet}

<PaginationPrimitive.PrevButton
	bind:ref
	aria-label={$_('common.pagination.goToPrevious')}
	class={cn(buttonVariants({ variant: 'ghost' }), 'ps-1.5!', className)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		{@render Fallback()}
	{/if}
</PaginationPrimitive.PrevButton>
