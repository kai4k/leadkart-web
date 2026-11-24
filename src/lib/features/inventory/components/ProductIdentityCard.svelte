<script lang="ts">
	import { Card } from '#lib/components/ui/index.ts';
	import type { ProductDto } from '#lib/features/inventory/schemas.ts';

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
				<dt class="caption text-muted-foreground">Brand</dt>
				<dd class="body-sm text-foreground">{product.brand_name}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-muted-foreground">Generic</dt>
				<dd class="body-sm text-foreground">{product.generic_name || '—'}</dd>
			</div>
			<div class="stack stack-tight sm:col-span-2">
				<dt class="caption text-muted-foreground">Composition</dt>
				<dd class="body-sm text-foreground">{product.composition || '—'}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-muted-foreground">Manufacturer</dt>
				<dd class="body-sm text-foreground">{product.manufacturer_name || '—'}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-muted-foreground">License no.</dt>
				<dd class="body-sm text-foreground">{product.manufacturing_license_no || '—'}</dd>
			</div>
		</dl>
	</Card.Content>
</Card.Root>
