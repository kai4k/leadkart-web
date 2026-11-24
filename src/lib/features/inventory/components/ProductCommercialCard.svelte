<script lang="ts">
	import { Card } from '#lib/components/ui/index.ts';
	import type { ProductDto } from '#lib/features/inventory/schemas.ts';
	import { computePriceWithGst, formatPrice } from '#lib/features/inventory/view-models.ts';

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
				<dt class="caption text-muted-foreground">Pack</dt>
				<dd class="body-sm text-foreground">
					{product.pack_size || '—'} · {product.pack_type || '—'} · {product.units_per_pack} units
				</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-muted-foreground">HSN</dt>
				<dd class="body-sm text-foreground"><code>{product.hsn_code}</code></dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-muted-foreground">MRP</dt>
				<dd class="body-sm text-foreground tabular-nums">{formatPrice(product.mrp)}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-muted-foreground">GST</dt>
				<dd class="body-sm text-foreground tabular-nums">{product.gst_percentage}%</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-muted-foreground">Purchase rate</dt>
				<dd class="body-sm text-foreground tabular-nums">
					{formatPrice(product.purchase_rate)}
					<span class="caption text-muted-foreground"
						>(incl. GST: {formatPrice(purchaseRateWithGst)})</span
					>
				</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-muted-foreground">Sale rate</dt>
				<dd class="body-sm text-foreground tabular-nums">
					{formatPrice(product.sale_rate)}
					<span class="caption text-muted-foreground"
						>(incl. GST: {formatPrice(saleRateWithGst)})</span
					>
				</dd>
			</div>
		</dl>
	</Card.Content>
</Card.Root>
