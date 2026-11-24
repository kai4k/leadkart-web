<!--
	OrderStatusBadge — thin wrapper composing $ui StatusPill with the
	order status → variant + label mapping from view-models. Read-only
	(never renders the inline picker) because lifecycle transitions go
	through OrderActionButtons, not status picking.
-->
<script lang="ts">
	import { StatusPill, type StatusPillOption } from '#lib/components/ui/index.ts';
	import { orderStatusSchema, type OrderStatus } from '#lib/features/orders/schemas.ts';
	import { statusBadge } from '#lib/features/orders/view-models.ts';
	import type { BadgeVariant } from '#lib/components/ui/badge/index.ts';

	type Props = {
		status: OrderStatus;
		class?: string;
	};

	let { status, class: className = '' }: Props = $props();

	const options: StatusPillOption[] = orderStatusSchema.options.map((s) => {
		const sb = statusBadge(s);
		return { value: s, label: sb.label, variant: variantFor(sb.variant) };
	});

	function variantFor(v: ReturnType<typeof statusBadge>['variant']): BadgeVariant {
		// view-models uses an internal palette name; map to Badge palette.
		switch (v) {
			case 'success':
				return 'success';
			case 'danger':
				return 'danger';
			case 'warning':
				return 'warning';
			case 'info':
				return 'info';
			case 'brand':
				return 'brand';
			case 'neutral':
			default:
				return 'neutral';
		}
	}
</script>

<StatusPill value={status} {options} class={className} />
