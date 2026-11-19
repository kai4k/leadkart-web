<script lang="ts" generics="T">
	/**
	 * InfiniteListFooter — the bottom of every cursor-paged list: the scroll sentinel the
	 * infinite-list hook observes, an always-mounted polite status region (its text changes, so
	 * screen readers announce "Loading more…"), a real "Load more" button for keyboard and
	 * screen-reader users, and one end-of-list line.
	 *
	 * Focus: the button stays focusable while a page loads (`aria-disabled`, not `disabled`), since
	 * tabbing to it brings the sentinel into view and starts the load itself. When the last page
	 * lands and the button goes away, focus moves to the status region instead of dropping to `<body>`.
	 */
	import { tick } from 'svelte';
	import { Button } from '#lib/components/ui/index.ts';
	import type { InfiniteList } from '#lib/hooks/index.ts';

	type Props = { list: InfiniteList<T> };
	let { list }: Props = $props();

	let button = $state<HTMLButtonElement | null>(null);
	let statusRegion = $state<HTMLElement | null>(null);

	const status = $derived(
		list.isFetchingNextPage
			? 'Loading more…'
			: !list.hasNextPage && list.items.length > 0
				? 'End of list'
				: ''
	);

	// Runs before the DOM update that removes the button, while it still has focus to be checked.
	$effect.pre(() => {
		if (list.hasNextPage || !button || document.activeElement !== button) return;
		void tick().then(() => statusRegion?.focus());
	});
</script>

<div class="stack stack-tight items-center py-4">
	<div bind:this={list.sentinelRef} class="h-px w-full" aria-hidden="true"></div>
	<p
		bind:this={statusRegion}
		class="caption text-fg-muted text-center"
		aria-live="polite"
		tabindex="-1"
	>
		{status}
	</p>
	{#if list.hasNextPage}
		<Button
			bind:ref={button}
			variant="ghost"
			size="sm"
			loading={list.isFetchingNextPage}
			focusableWhileLoading
			onclick={() => void list.query.fetchNextPage()}
		>
			Load more
		</Button>
	{/if}
</div>
