<script lang="ts">
	import { Badge, Skeleton, Alert, Button, EmptyState } from '$ui';
	import { Icon, Inbox } from '$icons';
	import { stockAdjustmentsQuery } from '$features/inventory/queries';
	import { adjustmentReasonLabel, formatDelta } from '$features/inventory/view-models';

	type Props = {
		itemId: string;
		/** When set, only renders the first N rows (used by the detail-page summary). */
		limit?: number;
	};

	let { itemId, limit }: Props = $props();

	const query = $derived(stockAdjustmentsQuery(itemId));

	const adjustments = $derived.by(() => {
		const pages = query.data?.pages ?? [];
		const all = pages.flatMap((p) => p.items);
		return limit ? all.slice(0, limit) : all;
	});

	const hasMore = $derived(query.hasNextPage && !limit);
</script>

{#if query.isPending}
	<div class="stack stack-tight" aria-busy="true">
		{#each [0, 1, 2] as i (i)}
			<Skeleton class="h-12 w-full rounded-md" />
		{/each}
	</div>
{:else if query.isError}
	<Alert variant="danger" title="Couldn't load history">{query.error?.message}</Alert>
{:else if adjustments.length === 0}
	<EmptyState
		icon={Inbox}
		title="No adjustments yet"
		description="Stock changes will appear here."
	/>
{:else}
	<ul
		class="stack stack-tight"
		style="list-style:none;margin:0;padding:0;"
		data-testid="stock-history-list"
	>
		{#each adjustments as a (a.id)}
			<li
				class="border-border flex items-start justify-between gap-3 border-b py-3 last:border-b-0"
			>
				<div class="stack stack-tight">
					<div class="cluster cluster-tight">
						<Badge variant={a.delta > 0 ? 'success' : 'danger'} style="soft" size="sm">
							{formatDelta(a.delta)}
						</Badge>
						<span class="label text-fg">{adjustmentReasonLabel(a.reason)}</span>
					</div>
					{#if a.note}
						<p class="caption text-fg-muted whitespace-pre-wrap">{a.note}</p>
					{/if}
				</div>
				<div class="stack stack-tight items-end">
					<span class="caption text-fg-muted">
						{new Date(a.created_at).toLocaleString()}
					</span>
					<span class="caption text-fg-subtle">
						Stock after: <strong class="text-fg">{a.new_stock}</strong>
					</span>
				</div>
			</li>
		{/each}
	</ul>

	{#if hasMore}
		<div class="flex justify-center pt-2">
			<Button
				variant="ghost"
				size="sm"
				onclick={() => query.fetchNextPage()}
				loading={query.isFetchingNextPage}
			>
				Load more
			</Button>
		</div>
	{/if}

	{#if limit && (query.data?.pages?.[0]?.has_more || (query.data?.pages?.[0]?.items?.length ?? 0) > limit)}
		<div class="pt-2">
			<a href={`/inventory/${itemId}/history`} class="caption text-primary hover:underline">
				<Icon icon={Inbox} size="xs" /> See full history
			</a>
		</div>
	{/if}
{/if}
