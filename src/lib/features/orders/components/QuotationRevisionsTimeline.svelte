<!--
	QuotationRevisionsTimeline — wraps $ui/timeline to render every
	QuotationRevisionDto in chronological order with the revision
	number, total, optional notes, and `revised_at` timestamp.
-->
<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Timeline } from '#lib/components/ui/index.ts';
	import { Edit } from '#lib/icons/index.ts';
	import { formatMoney, longDate } from '#lib/features/orders/view-models.ts';
	import type { QuotationRevisionDto } from '#lib/features/orders/schemas.ts';

	type Props = {
		revisions: ReadonlyArray<QuotationRevisionDto>;
		currency?: string;
	};
	let { revisions, currency = 'INR' }: Props = $props();

	const sorted = $derived([...revisions].sort((a, b) => b.revision_number - a.revision_number));
</script>

{#if sorted.length === 0}
	<p class="caption text-muted-foreground py-4">No quotation revisions yet.</p>
{:else}
	<Timeline.Root data-testid="quotation-revisions-timeline">
		{#each sorted as rev (rev.revision_number)}
			<Timeline.Item
				icon={Edit}
				iconAccent="info"
				time={longDate(rev.revised_at)}
				datetime={rev.revised_at}
				title={`Revision ${rev.revision_number} — ${formatMoney(rev.total, currency)}`}
			>
				<div class="stack stack-tight">
					<p class="caption text-muted-foreground tabular-nums">
						{$_('orders.quotation.revisionLineSummary', {
							values: {
								lineCount: rev.items.length,
								subtotal: formatMoney(rev.subtotal, currency),
								gstTotal: formatMoney(rev.gst_total, currency)
							}
						})}
					</p>
					{#if rev.notes}
						<p class="body-sm text-foreground whitespace-pre-wrap">{rev.notes}</p>
					{/if}
				</div>
			</Timeline.Item>
		{/each}
	</Timeline.Root>
{/if}
