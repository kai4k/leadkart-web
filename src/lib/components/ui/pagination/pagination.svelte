<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		count = 0,
		perPage = 10,
		page = $bindable(1),
		siblingCount = 1,
		...restProps
	}: PaginationPrimitive.RootProps = $props();
</script>

<PaginationPrimitive.Root
	bind:ref
	bind:page
	role="navigation"
	aria-label={$_('common.pagination.label')}
	data-slot="pagination"
	{count}
	{perPage}
	{siblingCount}
	class={cn('mx-auto flex w-full justify-center', className)}
	{...restProps}
/>
