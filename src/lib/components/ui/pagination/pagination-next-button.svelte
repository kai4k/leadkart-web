<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import { ChevronRight as ChevronRightIcon } from '#lib/icons/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { buttonVariants } from '../button/index.ts';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: PaginationPrimitive.NextButtonProps = $props();
</script>

{#snippet Fallback()}
	<span>{$_('common.pagination.next')}</span>
	<ChevronRightIcon class={cn('rtl:rotate-180 size-4', className)} />
{/snippet}

<PaginationPrimitive.NextButton
	bind:ref
	aria-label={$_('common.pagination.goToNext')}
	class={cn(buttonVariants({ variant: 'ghost' }), 'pe-1.5!', className)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		{@render Fallback()}
	{/if}
</PaginationPrimitive.NextButton>
