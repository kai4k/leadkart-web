<script lang="ts">
	import { Card } from '$ui';
	import type { ProductDto } from '$features/inventory/schemas';

	type Props = { product: ProductDto };
	let { product }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Identity</Card.Title>
	</Card.Header>
	<Card.Content>
		<dl class="grid gap-3 sm:grid-cols-2">
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Brand</dt>
				<dd class="body-sm text-fg">{product.brand_name}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Generic</dt>
				<dd class="body-sm text-fg">{product.generic_name || '—'}</dd>
			</div>
			<div class="stack stack-tight sm:col-span-2">
				<dt class="caption text-fg-muted">Composition</dt>
				<dd class="body-sm text-fg">{product.composition || '—'}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Manufacturer</dt>
				<dd class="body-sm text-fg">{product.manufacturer_name || '—'}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">License no.</dt>
				<dd class="body-sm text-fg">{product.manufacturing_license_no || '—'}</dd>
			</div>
		</dl>
	</Card.Content>
</Card.Root>
