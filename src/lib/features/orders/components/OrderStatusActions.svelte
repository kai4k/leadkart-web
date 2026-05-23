<script lang="ts">
	import { Button, ConfirmDialog } from '$ui';
	import { Icon, CheckCircle2, Truck, Inbox, XCircle, RotateCcw } from '$icons';
	import { nextStatesFor } from '$features/orders/view-models';
	import {
		confirmOrderMutation,
		shipOrderMutation,
		deliverOrderMutation,
		cancelOrderMutation,
		refundOrderMutation
	} from '$features/orders/queries';
	import type { OrderDto, OrderStatus } from '$features/orders/schemas';

	type Props = { order: OrderDto };
	let { order }: Props = $props();

	const next = $derived<OrderStatus[]>(nextStatesFor(order.status));

	const confirmM = confirmOrderMutation();
	const shipM = shipOrderMutation();
	const deliverM = deliverOrderMutation();
	const cancelM = cancelOrderMutation();
	const refundM = refundOrderMutation();

	const isBusy = $derived(
		confirmM.isPending ||
			shipM.isPending ||
			deliverM.isPending ||
			cancelM.isPending ||
			refundM.isPending
	);

	// ── Ship dialog state ────────────────────────────────────────────
	let shipOpen = $state(false);
	let trackingNumber = $state('');

	function openShip() {
		trackingNumber = '';
		shipOpen = true;
	}
	async function onShipConfirm() {
		await new Promise<void>((resolve, reject) =>
			shipM.mutate(
				{ id: order.id, body: { tracking_number: trackingNumber || '' } },
				{ onSuccess: () => resolve(), onError: (e) => reject(e) }
			)
		).catch(() => undefined);
		shipOpen = false;
	}

	// ── Cancel dialog state ──────────────────────────────────────────
	let cancelOpen = $state(false);
	let cancelReason = $state('');
	let cancelError: string | null = $state(null);

	function openCancel() {
		cancelReason = '';
		cancelError = null;
		cancelOpen = true;
	}
	async function onCancelConfirm() {
		if (cancelReason.trim().length === 0) {
			cancelError = 'Reason is required';
			return;
		}
		await new Promise<void>((resolve, reject) =>
			cancelM.mutate(
				{ id: order.id, body: { reason: cancelReason } },
				{ onSuccess: () => resolve(), onError: (e) => reject(e) }
			)
		).catch(() => undefined);
		cancelOpen = false;
	}

	// ── Refund dialog state ──────────────────────────────────────────
	let refundOpen = $state(false);
	let refundReason = $state('');
	let refundError: string | null = $state(null);

	function openRefund() {
		refundReason = '';
		refundError = null;
		refundOpen = true;
	}
	async function onRefundConfirm() {
		if (refundReason.trim().length === 0) {
			refundError = 'Reason is required';
			return;
		}
		await new Promise<void>((resolve, reject) =>
			refundM.mutate(
				{ id: order.id, body: { reason: refundReason } },
				{ onSuccess: () => resolve(), onError: (e) => reject(e) }
			)
		).catch(() => undefined);
		refundOpen = false;
	}

	function onConfirm() {
		confirmM.mutate(order.id);
	}
	function onDeliver() {
		deliverM.mutate(order.id);
	}
</script>

<div class="cluster cluster-tight" data-testid="order-status-actions">
	{#if next.includes('confirmed')}
		<Button
			variant="primary"
			size="sm"
			onclick={onConfirm}
			loading={confirmM.isPending}
			disabled={isBusy}
		>
			<Icon icon={CheckCircle2} size="sm" /> Confirm
		</Button>
	{/if}
	{#if next.includes('shipped')}
		<Button variant="primary" size="sm" onclick={openShip} disabled={isBusy}>
			<Icon icon={Truck} size="sm" /> Ship
		</Button>
	{/if}
	{#if next.includes('delivered')}
		<Button
			variant="primary"
			size="sm"
			onclick={onDeliver}
			loading={deliverM.isPending}
			disabled={isBusy}
		>
			<Icon icon={Inbox} size="sm" /> Mark delivered
		</Button>
	{/if}
	{#if next.includes('refunded')}
		<Button variant="tonal" size="sm" onclick={openRefund} disabled={isBusy}>
			<Icon icon={RotateCcw} size="sm" /> Refund
		</Button>
	{/if}
	{#if next.includes('cancelled')}
		<Button variant="ghost" size="sm" onclick={openCancel} disabled={isBusy}>
			<Icon icon={XCircle} size="sm" /> Cancel
		</Button>
	{/if}
</div>

<ConfirmDialog
	bind:open={shipOpen}
	title="Ship order"
	description="Optionally attach a tracking number — it will appear on the order detail."
	confirmLabel="Mark shipped"
	loading={shipM.isPending}
	onConfirm={onShipConfirm}
>
	{#snippet body()}
		<label class="stack stack-tight">
			<span class="label">Tracking number (optional)</span>
			<input
				class="glass-input rounded-md px-3 py-2 text-sm"
				placeholder="e.g. 1Z999AA10123456784"
				data-testid="ship-tracking-number"
				bind:value={trackingNumber}
			/>
		</label>
	{/snippet}
</ConfirmDialog>

<ConfirmDialog
	bind:open={cancelOpen}
	title="Cancel order"
	description="Provide a reason — it will be recorded on the order."
	confirmLabel="Cancel order"
	cancelLabel="Keep order"
	variant="danger"
	loading={cancelM.isPending}
	onConfirm={onCancelConfirm}
>
	{#snippet body()}
		<label class="stack stack-tight">
			<span class="label">Reason (required)</span>
			<textarea
				rows={3}
				class="glass-input w-full rounded-md px-3 py-2 text-sm"
				bind:value={cancelReason}
				maxlength={1024}
				data-testid="cancel-reason"
			></textarea>
			{#if cancelError}
				<span class="caption text-danger-700">{cancelError}</span>
			{/if}
		</label>
	{/snippet}
</ConfirmDialog>

<ConfirmDialog
	bind:open={refundOpen}
	title="Refund order"
	description="Provide a reason — it will be recorded on the order."
	confirmLabel="Refund order"
	variant="danger"
	loading={refundM.isPending}
	onConfirm={onRefundConfirm}
>
	{#snippet body()}
		<label class="stack stack-tight">
			<span class="label">Reason (required)</span>
			<textarea
				rows={3}
				class="glass-input w-full rounded-md px-3 py-2 text-sm"
				bind:value={refundReason}
				maxlength={1024}
				data-testid="refund-reason"
			></textarea>
			{#if refundError}
				<span class="caption text-danger-700">{refundError}</span>
			{/if}
		</label>
	{/snippet}
</ConfirmDialog>
