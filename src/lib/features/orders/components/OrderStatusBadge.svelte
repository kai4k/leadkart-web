<script lang="ts">
	import { Badge } from '$ui';
	import { statusBadge } from '$features/orders/view-models';
	import type { OrderStatus } from '$features/orders/schemas';

	type Props = { status: OrderStatus; size?: 'sm' | 'md' };
	let { status, size = 'sm' }: Props = $props();

	const b = $derived(statusBadge(status));
</script>

<Badge variant={b.variant} style="soft" {size}>{b.label}</Badge>
