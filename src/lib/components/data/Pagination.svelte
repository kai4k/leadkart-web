<script lang="ts" module>
	export type PaginationChange = (page: number) => void;
</script>

<script lang="ts">
	/**
	 * Offset pager: the app's `page / pageCount / onChange` API on the regenerated `ui/pagination`
	 * parts (bits-ui Pagination). First and last page are always shown, `…` for the gaps.
	 */
	import * as Pagination from '#lib/components/ui/pagination/index.ts';
	import { buttonVariants } from '#lib/components/ui/button/index.ts';
	import { ChevronLeft, ChevronRight } from '#lib/icons/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	type Props = {
		page: number;
		pageCount: number;
		onChange: PaginationChange;
		/** The landmark's accessible name. */
		label?: string;
		class?: string;
	};

	let { page, pageCount, onChange, label = 'Pagination', class: className }: Props = $props();
</script>

<Pagination.Root
	count={pageCount}
	perPage={1}
	{page}
	onPageChange={onChange}
	aria-label={label}
	class={cn('justify-start', className)}
>
	{#snippet children({ pages })}
		<Pagination.Content>
			<Pagination.Item>
				<Pagination.PrevButton
					aria-label="Previous page"
					class={buttonVariants({ variant: 'tonal', size: 'sm' })}
				>
					<ChevronLeft class="rtl:rotate-180" aria-hidden="true" />Prev
				</Pagination.PrevButton>
			</Pagination.Item>
			{#each pages as p (p.key)}
				<Pagination.Item>
					{#if p.type === 'ellipsis'}
						<Pagination.Ellipsis />
					{:else}
						<Pagination.Link
							page={p}
							isActive={p.value === page}
							size="sm"
							class={cn(
								'min-w-8',
								p.value === page
									? 'border-transparent bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground'
									: 'border-border bg-muted text-foreground hover:bg-secondary'
							)}
						/>
					{/if}
				</Pagination.Item>
			{/each}
			<Pagination.Item>
				<Pagination.NextButton
					aria-label="Next page"
					class={buttonVariants({ variant: 'tonal', size: 'sm' })}
				>
					Next<ChevronRight class="rtl:rotate-180" aria-hidden="true" />
				</Pagination.NextButton>
			</Pagination.Item>
		</Pagination.Content>
	{/snippet}
</Pagination.Root>
