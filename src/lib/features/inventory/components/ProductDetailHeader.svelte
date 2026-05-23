<script lang="ts">
	import { Badge, Button, Dropdown } from '$ui';
	import { Icon, ArrowLeft, MoreVertical, Edit, Trash2 } from '$icons';
	import { goto } from '$app/navigation';
	import type { ProductDto } from '$features/inventory/schemas';
	import {
		drugScheduleBadge,
		expiryStatus,
		stockLevelBadge,
		activeBadge
	} from '$features/inventory/view-models';

	type Props = {
		product: ProductDto;
		onEdit: () => void;
		onDelete: () => void;
	};
	let { product, onEdit, onDelete }: Props = $props();

	const sched = $derived(drugScheduleBadge(product.drug_schedule));
	const stock = $derived(stockLevelBadge(product));
	const expiry = $derived(expiryStatus(product.earliest_expiry_at));
	const active = $derived(activeBadge(product));
</script>

<header class="stack stack-tight">
	<button
		type="button"
		class="caption text-fg-muted hover:text-fg cluster cluster-tight self-start"
		onclick={() => goto('/inventory')}
	>
		<Icon icon={ArrowLeft} size="xs" /> Back to inventory
	</button>

	<div class="cluster cluster-spread items-start">
		<div class="stack stack-tight min-w-0">
			<h1 class="h1 truncate">{product.brand_name}</h1>
			{#if product.generic_name}
				<p class="body-base text-fg-muted truncate">{product.generic_name}</p>
			{/if}
			<div class="cluster cluster-tight pt-2">
				<Badge variant="info" style="soft">{product.product_category}</Badge>
				<Badge variant="neutral" style="soft">{product.product_type}</Badge>
				<span data-testid="drug-schedule-pill">
					<Badge variant={sched.variant} style="soft">{sched.label}</Badge>
				</span>
				<Badge variant={active.variant} style="soft">{active.label}</Badge>
			</div>
		</div>

		<div class="cluster cluster-tight shrink-0">
			<div class="stack stack-tight items-end">
				<div class="cluster cluster-tight">
					<span data-testid="stock-pill">
						<Badge variant={stock.variant} style="soft">{stock.label}</Badge>
					</span>
					<span class="body-base text-fg tabular-nums" data-testid="stock-count">
						{product.total_quantity_available} units
					</span>
				</div>
				{#if expiry}
					<span data-testid="expiry-pill">
						<Badge variant={expiry.variant} style="soft">{expiry.label}</Badge>
					</span>
				{/if}
			</div>

			<Dropdown.Root>
				<Dropdown.Trigger>
					<Button variant="ghost" size="md" aria-label="More actions">
						<Icon icon={MoreVertical} size="sm" />
					</Button>
				</Dropdown.Trigger>
				<Dropdown.Menu>
					<Dropdown.Item onSelect={onEdit}>
						<Icon icon={Edit} size="sm" /> Edit
					</Dropdown.Item>
					<Dropdown.Separator />
					<Dropdown.Item variant="danger" onSelect={onDelete}>
						<Icon icon={Trash2} size="sm" /> Delete
					</Dropdown.Item>
				</Dropdown.Menu>
			</Dropdown.Root>
		</div>
	</div>
</header>
