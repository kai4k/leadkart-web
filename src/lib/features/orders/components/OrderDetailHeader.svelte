<script lang="ts">
	import PageHeader from '$layouts/PageHeader.svelte';
	import { resolve } from '$app/paths';
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

<!--
	OrderDetailHeader — top of the detail page. Shows order_number,
	customer name, status pill, action buttons, and the lifecycle
	stepper. The parent provides the dialog open-state callbacks for the
	transitions that need extra input.
-->

<PageHeader title={`Order ${order.order_number}`} titleTestId="order-number">
	{#snippet meta()}
		<span data-testid="order-status-badge">
			<OrderStatusBadge status={order.status} />
		</span>
	{/snippet}
</PageHeader>

<header class="stack stack-relaxed">
	<div class="cluster cluster-spread items-start gap-4">
		<div class="stack stack-tight min-w-0">
			<div class="cluster cluster-tight">
				<a
					href={resolve('/(app)/leads/[id]', { id: order.customer_lead_id })}
					class="body-sm text-primary-text hover:underline"
				>
					{order.customer_name}
				</a>
				{#if order.customer_gst_number}
					<span class="caption text-muted-foreground">· GSTIN {order.customer_gst_number}</span>
				{/if}
				<code class="caption text-subtle-foreground">{order.id}</code>
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
