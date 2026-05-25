<!--
	PaymentsList — read-only list of recorded payments on the order.
	Shows kind (token/full), amount, method, optional reference, and
	receipt timestamp.
-->
<script lang="ts">
	import { Badge } from '$ui';
	import { formatMoney, longDate } from '$features/orders/view-models';
	import type { PaymentDto } from '$features/orders/schemas';

	type Props = {
		payments: ReadonlyArray<PaymentDto>;
		currency?: string;
	};
	let { payments, currency = 'INR' }: Props = $props();

	const sorted = $derived(
		[...payments].sort(
			(a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
		)
	);

	const methodLabel: Record<PaymentDto['method'], string> = {
		cash: 'Cash',
		upi: 'UPI',
		bank_transfer: 'Bank transfer',
		cheque: 'Cheque',
		card: 'Card',
		other: 'Other'
	};
</script>

{#if sorted.length === 0}
	<p class="caption text-fg-muted py-4">No payments recorded yet.</p>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full text-start text-sm" data-testid="payments-list">
			<thead>
				<tr class="border-border text-fg-muted border-b">
					<th class="px-2 py-2 text-xs uppercase">Kind</th>
					<th class="px-2 py-2 text-end text-xs uppercase">Amount</th>
					<th class="px-2 py-2 text-xs uppercase">Method</th>
					<th class="px-2 py-2 text-xs uppercase">Reference</th>
					<th class="px-2 py-2 text-xs uppercase">Received</th>
				</tr>
			</thead>
			<tbody>
				{#each sorted as p (p.id)}
					<tr class="border-border border-b">
						<td class="px-2 py-2">
							<Badge variant={p.kind === 'token' ? 'info' : 'success'} appearance="soft" size="sm">
								{p.kind === 'token' ? 'Token' : 'Full'}
							</Badge>
						</td>
						<td class="px-2 py-2 text-end tabular-nums">
							{formatMoney(p.amount, currency)}
						</td>
						<td class="px-2 py-2">{methodLabel[p.method]}</td>
						<td class="px-2 py-2">
							{#if p.reference}
								<code class="caption">{p.reference}</code>
							{:else}
								<span class="text-fg-subtle">—</span>
							{/if}
						</td>
						<td class="text-fg-muted caption px-2 py-2">{longDate(p.received_at)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
