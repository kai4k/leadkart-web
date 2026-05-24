<!--
	CreditNotesList — read-only list of credit notes issued against this
	order. Cancellation post-invoice always emits one CN per cancelled
	invoice via the `CreditNoteIssued` outbox event.
-->
<script lang="ts">
	import { formatMoney, longDate } from '$features/orders/view-models';
	import type { CreditNoteDto } from '$features/orders/schemas';

	type Props = {
		creditNotes: ReadonlyArray<CreditNoteDto>;
		currency?: string;
	};
	let { creditNotes, currency = 'INR' }: Props = $props();

	const sorted = $derived(
		[...creditNotes].sort(
			(a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
		)
	);
</script>

{#if sorted.length === 0}
	<p class="caption text-fg-muted py-4">No credit notes issued.</p>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full text-start text-sm" data-testid="credit-notes-list">
			<thead>
				<tr class="border-border text-fg-muted border-b">
					<th class="px-2 py-2 text-xs uppercase">CN number</th>
					<th class="px-2 py-2 text-xs uppercase">FY</th>
					<th class="px-2 py-2 text-end text-xs uppercase">Amount</th>
					<th class="px-2 py-2 text-xs uppercase">Reason</th>
					<th class="px-2 py-2 text-xs uppercase">Issued</th>
				</tr>
			</thead>
			<tbody>
				{#each sorted as cn (cn.id)}
					<tr class="border-border border-b">
						<td class="px-2 py-2"><code class="caption">{cn.credit_note_number}</code></td>
						<td class="px-2 py-2">{cn.fy}</td>
						<td class="px-2 py-2 text-end tabular-nums">{formatMoney(cn.amount, currency)}</td>
						<td class="px-2 py-2">{cn.reason}</td>
						<td class="text-fg-muted caption px-2 py-2">{longDate(cn.issued_at)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
