<script lang="ts" module>
	export type PaginationChange = (page: number) => void;
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { ChevronLeft, ChevronRight, Icon } from '$icons';
	import { cn, type WithElementRef } from '$lib/utils/cn';
	import { Button } from '../button';
	import { ButtonGroup } from '../button-group';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		page: number;
		pageCount: number;
		onChange: PaginationChange;
	};

	let {
		ref = $bindable(null),
		page,
		pageCount,
		onChange,
		class: className = '',
		...rest
	}: Props = $props();

	const canPrev = $derived(page > 1);
	const canNext = $derived(page < pageCount);

	function visiblePages(current: number, total: number): Array<number | 'gap'> {
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
		const pages: Array<number | 'gap'> = [1];
		if (current > 3) pages.push('gap');
		const start = Math.max(2, current - 1);
		const end = Math.min(total - 1, current + 1);
		for (let i = start; i <= end; i++) pages.push(i);
		if (current < total - 2) pages.push('gap');
		pages.push(total);
		return pages;
	}

	const pages = $derived(visiblePages(page, pageCount));
</script>

<nav bind:this={ref} data-slot="pagination" aria-label="Pagination" class={cn(className)} {...rest}>
	<ButtonGroup>
		<Button
			variant="tonal"
			size="sm"
			disabled={!canPrev}
			aria-label="Previous page"
			onclick={() => onChange(page - 1)}
		>
			<Icon icon={ChevronLeft} size="sm" />Prev
		</Button>
		{#each pages as p, i (i)}
			{#if p === 'gap'}
				<span class="text-fg-subtle inline-flex items-center px-2" aria-hidden="true">…</span>
			{:else}
				<Button
					variant={p === page ? 'primary' : 'tonal'}
					size="sm"
					aria-current={p === page ? 'page' : undefined}
					aria-label={`Go to page ${p}`}
					onclick={() => onChange(p)}>{p}</Button
				>
			{/if}
		{/each}
		<Button
			variant="tonal"
			size="sm"
			disabled={!canNext}
			aria-label="Next page"
			onclick={() => onChange(page + 1)}
		>
			Next<Icon icon={ChevronRight} size="sm" />
		</Button>
	</ButtonGroup>
</nav>
