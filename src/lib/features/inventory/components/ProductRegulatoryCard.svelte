<script lang="ts">
	import { Badge, Card } from '$ui';
	import type { ProductDto } from '$features/inventory/schemas';
	import { drugScheduleBadge } from '$features/inventory/view-models';

	type Props = { product: ProductDto };
	let { product }: Props = $props();

	const sched = $derived(drugScheduleBadge(product.drug_schedule));
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Regulatory</Card.Title>
	</Card.Header>
	<Card.Content>
		<dl class="grid gap-3 sm:grid-cols-2">
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Drug schedule</dt>
				<dd>
					<Badge variant={sched.variant} appearance="soft">{sched.label}</Badge>
				</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Shelf life</dt>
				<dd class="body-sm text-fg tabular-nums">{product.shelf_life_months} months</dd>
			</div>
			<div class="stack stack-tight sm:col-span-2">
				<dt class="caption text-fg-muted">Storage condition</dt>
				<dd class="body-sm text-fg">{product.storage_condition || '—'}</dd>
			</div>
		</dl>
	</Card.Content>
</Card.Root>
