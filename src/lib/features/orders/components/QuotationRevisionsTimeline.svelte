<!--
	QuotationRevisionsTimeline — wraps $ui/timeline to render every
	QuotationRevisionDto in chronological order with the revision
	number, total, optional notes, and `revised_at` timestamp.
-->
<script lang="ts">
	import { Timeline } from '$ui';
	import { Edit } from '$icons';
	import { formatMoney, longDate } from '$features/orders/view-models';
	import type { QuotationRevisionDto } from '$features/orders/schemas';

	type Props = {
		revisions: ReadonlyArray<QuotationRevisionDto>;
		currency?: string;
	};
	let { revisions, currency = 'INR' }: Props = $props();

	const sorted = $derived([...revisions].sort((a, b) => b.revision_number - a.revision_number));
</script>

{#if sorted.length === 0}
	<p class="caption text-fg-muted py-4">No quotation revisions yet.</p>
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
					<p class="caption text-fg-muted tabular-nums">
						{rev.items.length} line{rev.items.length === 1 ? '' : 's'} · subtotal {formatMoney(
							rev.subtotal,
							currency
						)} · GST {formatMoney(rev.gst_total, currency)}
					</p>
					{#if rev.notes}
						<p class="body-sm text-fg whitespace-pre-wrap">{rev.notes}</p>
					{/if}
				</div>
			</Timeline.Item>
		{/each}
	</Timeline.Root>
{/if}
