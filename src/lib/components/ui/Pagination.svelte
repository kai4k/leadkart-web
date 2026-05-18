<script lang="ts" module>
	export type PaginationChange = (page: number) => void;
</script>

<script lang="ts">
	import { ChevronLeft, ChevronRight, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';

	type Props = {
		page: number;
		pageCount: number;
		onChange: PaginationChange;
		class?: string;
	};

	let { page, pageCount, onChange, class: className = '' }: Props = $props();

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

<nav class={cn('cluster cluster-tight', className)} aria-label="Pagination">
	<button
		type="button"
		class="label inline-flex items-center gap-1 rounded-md px-2 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:cursor-not-allowed disabled:opacity-40"
		disabled={!canPrev}
		aria-label="Previous page"
		onclick={() => onChange(page - 1)}
	>
		<Icon icon={ChevronLeft} size="sm" />
		Prev
	</button>
	<ul class="cluster cluster-tight list-none">
		{#each pages as p, i (i)}
			<li>
				{#if p === 'gap'}
					<span class="px-2 text-[var(--color-fg-subtle)]">…</span>
				{:else}
					<button
						type="button"
						class={cn(
							'label inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2',
							p === page
								? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
								: 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-fg)]'
						)}
						aria-current={p === page ? 'page' : undefined}
						onclick={() => onChange(p)}
					>
						{p}
					</button>
				{/if}
			</li>
		{/each}
	</ul>
	<button
		type="button"
		class="label inline-flex items-center gap-1 rounded-md px-2 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] disabled:cursor-not-allowed disabled:opacity-40"
		disabled={!canNext}
		aria-label="Next page"
		onclick={() => onChange(page + 1)}
	>
		Next
		<Icon icon={ChevronRight} size="sm" />
	</button>
</nav>
