<script lang="ts">
	import { Badge } from '$ui';
	import { stockLevelBadge } from '$features/inventory/view-models';
	import type { InventoryItemDto } from '$features/inventory/schemas';

	type Props = {
		item: Pick<InventoryItemDto, 'current_stock' | 'reorder_point'>;
		size?: 'sm' | 'md';
	};

	let { item, size = 'sm' }: Props = $props();

	const vm = $derived(stockLevelBadge(item));
</script>

<Badge variant={vm.variant} style="soft" {size}>{vm.label}</Badge>
