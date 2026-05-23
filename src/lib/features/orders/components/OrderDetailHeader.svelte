<!--
	OrderDetailHeader — top of the detail page. Shows order_number,
	customer name, status pill, action buttons, and the lifecycle
	stepper. The parent provides the dialog open-state callbacks for the
	transitions that need extra input.
-->
<script lang="ts">
	import { CopyButton } from '$ui';
	import OrderActionButtons from './OrderActionButtons.svelte';
	import OrderLifecycleStepper from './OrderLifecycleStepper.svelte';
	import OrderStatusBadge from './OrderStatusBadge.svelte';
	import type { OrderDto } from '$features/orders/schemas';

	type Props = {
		order: OrderDto;
		onRevise: () => void;
		onRecordPayment: () => void;
		onMarkPacked: () => void;
		onDispatch: () => void;
		onCancel: () => void;
	};
	let { order, onRevise, onRecordPayment, onMarkPacked, onDispatch, onCancel }: Props = $props();
</script>

<header class="stack stack-relaxed">
	<div class="cluster cluster-spread items-start gap-4">
		<div class="stack stack-tight min-w-0">
			<div class="cluster cluster-tight">
				<h1 class="h1" data-testid="order-number">Order {order.order_number}</h1>
				<span data-testid="order-status-badge">
					<OrderStatusBadge status={order.status} />
				</span>
			</div>
			<div class="cluster cluster-tight">
				<a href={`/leads/${order.customer_lead_id}`} class="body-sm text-primary hover:underline">
					{order.customer_name}
				</a>
				{#if order.customer_gst_number}
					<span class="caption text-fg-muted">· GSTIN {order.customer_gst_number}</span>
				{/if}
				<code class="caption text-fg-subtle">{order.id}</code>
				<CopyButton value={order.id} label="Copy order ID" />
			</div>
		</div>

		<OrderActionButtons
			{order}
			{onRevise}
			{onRecordPayment}
			{onMarkPacked}
			{onDispatch}
			{onCancel}
		/>
	</div>

	<OrderLifecycleStepper {order} />
</header>
