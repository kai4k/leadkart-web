<script lang="ts">
	import { Button, EmptyState, Skeleton, Timeline } from '$ui';
	import { Activity } from '$icons';
	import { movementsInfiniteQuery } from '$features/inventory/queries';
	import {
		formatDelta,
		movementReasonAccent,
		movementReasonLabel
	} from '$features/inventory/view-models';

	/**
	 * StockMovementsTimeline — cursor-paginated audit log of every
	 * movement on a product. Renders via <Timeline.Root> with icon
	 * accent driven by the movement's reason.
	 */
	type Props = { productId: string };
	let { productId }: Props = $props();

	const query = $derived(movementsInfiniteQuery(productId));

	const movements = $derived.by(() => {
		const pages = query.data?.pages ?? [];
		return pages.flatMap((p) => p.items);
	});

	const isEmpty = $derived(!query.isPending && !query.isError && movements.length === 0);
</script>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h2 class="h5">Stock movements</h2>
		<p class="caption text-fg-muted">Every adjustment that has touched this product.</p>
	</header>

	{#if query.isError}
		<div class="border-danger-500 text-danger-700 rounded-md border p-4">
			Couldn't load movements. {query.error?.message ?? ''}
		</div>
	{:else if query.isPending}
		<div class="stack stack-tight">
			{#each [0, 1, 2, 3] as i (i)}
				<Skeleton class="h-12 w-full" />
			{/each}
		</div>
	{:else if isEmpty}
		<EmptyState
			icon={Activity}
			title="No movements yet"
			description="Movements appear here as you add batches or adjust stock."
		/>
	{:else}
		<Timeline.Root data-testid="movements-timeline">
			{#each movements as movement (movement.id)}
				{@const accent = movementReasonAccent(movement.reason)}
				<Timeline.Item
					iconAccent={accent}
					title={`${formatDelta(movement.delta)} · ${movementReasonLabel(movement.reason)}`}
					description={`Balance after: ${movement.balance_after}${movement.note ? ` · ${movement.note}` : ''}`}
					time={new Date(movement.occurred_at).toLocaleString()}
					datetime={movement.occurred_at}
				/>
			{/each}
		</Timeline.Root>

		{#if query.hasNextPage}
			<div class="flex justify-center">
				<Button
					variant="ghost"
					onclick={() => query.fetchNextPage()}
					loading={query.isFetchingNextPage}
				>
					Load more
				</Button>
			</div>
		{/if}
	{/if}
</div>
