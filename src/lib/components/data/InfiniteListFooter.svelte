<script lang="ts" generics="T">
	/**
	 * InfiniteListFooter — the bottom of every cursor-paged list: the scroll sentinel the
	 * infinite-list hook observes, an always-mounted polite status region (its text changes, so
	 * screen readers announce "Loading more…"), a real "Load more" button for keyboard and
	 * screen-reader users, and one end-of-list line.
	 */
	import { Button } from '#lib/components/ui/index.ts';
	import type { InfiniteList } from '#lib/hooks/index.ts';

	type Props = { list: InfiniteList<T> };
	let { list }: Props = $props();

	const status = $derived(
		list.isFetchingNextPage
			? 'Loading more…'
			: !list.hasNextPage && list.items.length > 0
				? 'End of list'
				: ''
	);
</script>

<div class="stack stack-tight items-center py-4">
	<div bind:this={list.sentinelRef} class="h-px w-full" aria-hidden="true"></div>
	<p class="caption text-fg-muted text-center" aria-live="polite">{status}</p>
	{#if list.hasNextPage}
		<Button
			variant="ghost"
			size="sm"
			loading={list.isFetchingNextPage}
			onclick={() => void list.query.fetchNextPage()}
		>
			Load more
		</Button>
	{/if}
</div>
