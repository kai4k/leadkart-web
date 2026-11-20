<script lang="ts">
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import { ChevronRight as ChevronRightIcon } from '#lib/icons/index.ts';
	import { buttonVariants } from '#lib/components/ui/button/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: PaginationPrimitive.NextButtonProps = $props();
</script>

<PaginationPrimitive.NextButton
	bind:ref
	aria-label="Go to next page"
	class={cn(buttonVariants({ variant: 'ghost', size: 'default' }), 'pe-1.5!', className)}
	{...restProps}
>
	<span class="hidden sm:block">Next</span>
	<ChevronRightIcon data-icon="inline-end" class="rtl:rotate-180" />
</PaginationPrimitive.NextButton>
