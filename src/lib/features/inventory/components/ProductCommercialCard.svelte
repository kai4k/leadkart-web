<script lang="ts">
	import { Card } from '$ui';
	import type { ProductDto } from '$features/inventory/schemas';
	import { computePriceWithGst, formatPrice } from '$features/inventory/view-models';

	type Props = { product: ProductDto };
	let { product }: Props = $props();

	const purchaseRateWithGst = $derived(
		computePriceWithGst(product.purchase_rate, product.gst_percentage)
	);
	const saleRateWithGst = $derived(computePriceWithGst(product.sale_rate, product.gst_percentage));
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Commercial</Card.Title>
	</Card.Header>
	<Card.Content>
		<dl class="grid gap-3 sm:grid-cols-2">
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Pack</dt>
				<dd class="body-sm text-fg">
					{product.pack_size || '—'} · {product.pack_type || '—'} · {product.units_per_pack} units
				</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">HSN</dt>
				<dd class="body-sm text-fg"><code>{product.hsn_code}</code></dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">MRP</dt>
				<dd class="body-sm text-fg tabular-nums">{formatPrice(product.mrp)}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">GST</dt>
				<dd class="body-sm text-fg tabular-nums">{product.gst_percentage}%</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Purchase rate</dt>
				<dd class="body-sm text-fg tabular-nums">
					{formatPrice(product.purchase_rate)}
					<span class="caption text-fg-muted">(incl. GST: {formatPrice(purchaseRateWithGst)})</span>
				</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Sale rate</dt>
				<dd class="body-sm text-fg tabular-nums">
					{formatPrice(product.sale_rate)}
					<span class="caption text-fg-muted">(incl. GST: {formatPrice(saleRateWithGst)})</span>
				</dd>
			</div>
		</dl>
	</Card.Content>
</Card.Root>
