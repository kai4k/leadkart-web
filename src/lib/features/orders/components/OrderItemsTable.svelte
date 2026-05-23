<!--
	OrderItemsTable — read-only line-item table for the detail page's
	"Items" tab. Renders `current_items` with computed money formatting.
	Editable items are surfaced via ReviseQuotationDrawer instead.
-->
<script lang="ts">
	import { formatMoney } from '$features/orders/view-models';
	import type { OrderItemDto } from '$features/orders/schemas';

	type Props = {
		items: ReadonlyArray<OrderItemDto>;
		currency?: string;
		subtotal?: number;
		gstTotal?: number;
		discountTotal?: number;
		total?: number;
	};

	let { items, currency = 'INR', subtotal, gstTotal, discountTotal, total }: Props = $props();
</script>

<div class="overflow-x-auto">
	<table class="w-full text-left text-sm" data-testid="order-items-table">
		<thead>
			<tr class="border-border text-fg-muted border-b">
				<th class="px-2 py-2 text-xs uppercase">Brand</th>
				<th class="px-2 py-2 text-xs uppercase">Batch</th>
				<th class="px-2 py-2 text-xs uppercase">HSN</th>
				<th class="px-2 py-2 text-right text-xs uppercase">Qty</th>
				<th class="px-2 py-2 text-right text-xs uppercase">Unit</th>
				<th class="px-2 py-2 text-right text-xs uppercase">GST %</th>
				<th class="px-2 py-2 text-right text-xs uppercase">Line total</th>
			</tr>
		</thead>
		<tbody>
			{#each items as item, idx (item.batch_id + ':' + idx)}
				<tr class="border-border border-b">
					<td class="px-2 py-2">
						<div class="stack stack-tight">
							<span class="body-sm text-fg">{item.brand_name}</span>
							{#if item.pack_size}
								<span class="caption text-fg-muted">{item.pack_size}</span>
							{/if}
						</div>
					</td>
					<td class="px-2 py-2"><code class="caption">{item.batch_number}</code></td>
					<td class="px-2 py-2"><code class="caption">{item.hsn_code ?? '—'}</code></td>
					<td class="px-2 py-2 text-right tabular-nums">{item.quantity}</td>
					<td class="px-2 py-2 text-right tabular-nums">
						{formatMoney(item.unit_price, currency)}
					</td>
					<td class="px-2 py-2 text-right tabular-nums">{item.gst_percentage}%</td>
					<td class="px-2 py-2 text-right tabular-nums">
						{formatMoney(item.line_total, currency)}
					</td>
				</tr>
			{/each}
		</tbody>
		{#if total != null}
			<tfoot>
				{#if subtotal != null}
					<tr>
						<td colspan="6" class="text-fg-muted px-2 py-1 text-right">Subtotal</td>
						<td class="text-fg px-2 py-1 text-right tabular-nums">
							{formatMoney(subtotal, currency)}
						</td>
					</tr>
				{/if}
				{#if discountTotal != null && discountTotal > 0}
					<tr>
						<td colspan="6" class="text-fg-muted px-2 py-1 text-right">Discount</td>
						<td class="text-fg px-2 py-1 text-right tabular-nums">
							−{formatMoney(discountTotal, currency)}
						</td>
					</tr>
				{/if}
				{#if gstTotal != null}
					<tr>
						<td colspan="6" class="text-fg-muted px-2 py-1 text-right">GST</td>
						<td class="text-fg px-2 py-1 text-right tabular-nums">
							{formatMoney(gstTotal, currency)}
						</td>
					</tr>
				{/if}
				<tr class="border-border border-t">
					<td colspan="6" class="text-fg px-2 py-2 text-right font-semibold">Total</td>
					<td
						class="text-fg px-2 py-2 text-right font-semibold tabular-nums"
						data-testid="order-total"
					>
						{formatMoney(total, currency)}
					</td>
				</tr>
			</tfoot>
		{/if}
	</table>

	{#if items.length === 0}
		<p class="caption text-fg-muted py-4 text-center">No line items</p>
	{/if}
</div>
