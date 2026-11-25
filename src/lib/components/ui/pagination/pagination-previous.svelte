<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import { ChevronLeft as ChevronLeftIcon } from '#lib/icons/index.ts';
	import { buttonVariants } from '#lib/components/ui/button/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: PaginationPrimitive.PrevButtonProps = $props();
</script>

<PaginationPrimitive.PrevButton
	bind:ref
	aria-label={$_('common.pagination.goToPrevious')}
	class={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'ps-1.5!', className)}
	{...restProps}
>
	<ChevronLeftIcon data-icon="inline-start" class="rtl:rotate-180" />
	<span class="hidden sm:block">Previous</span>
</PaginationPrimitive.PrevButton>
