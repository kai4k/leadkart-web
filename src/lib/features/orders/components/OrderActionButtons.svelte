<!--
	OrderActionButtons — renders one button per LEGAL next state per
	`nextStatesFor(status)` + the related capability predicates. The
	parent owns the dialog open-state for transitions that need confirm
	/ extra input (cancel reason, packed box count, dispatch carrier).
	Direct-flip actions (confirm, generate-invoice, mark-delivered,
	complete) fire straight through to their mutations.
-->
<script lang="ts">
	import { Button } from '$ui';
	import { Icon, Edit, Check, Truck, Package, X, CheckCircle2 } from '$icons';
	import type { OrderDto } from '$features/orders/schemas';
	import {
		canApprove,
		canCancel,
		canComplete,
		canConfirm,
		canDispatch,
		canGenerateInvoice,
		canMarkDelivered,
		canMarkPacked,
		canRecordFullPayment,
		canRecordTokenPayment,
		canRevise
	} from '$features/orders/view-models';
	import { untrack } from 'svelte';
	import {
		approveQuotationMutation,
		completeOrderMutation,
		confirmOrderMutation,
		generateInvoiceMutation,
		markDeliveredMutation
	} from '$features/orders/queries';

	type Props = {
		order: OrderDto;
		onRevise: () => void;
		onRecordPayment: () => void;
		onMarkPacked: () => void;
		onDispatch: () => void;
		onCancel: () => void;
	};

	let { order, onRevise, onRecordPayment, onMarkPacked, onDispatch, onCancel }: Props = $props();

	// Capture id once. order.id is invariant for the lifetime of this
	// mounted instance — each order has its own detail route + remount.
	const orderId = untrack(() => order.id);

	// Mutations whose handlers are 100% local (no extra input dialog).
	const approveM = approveQuotationMutation(orderId);
	const confirmM = confirmOrderMutation(orderId);
	const generateInvoiceM = generateInvoiceMutation(orderId);
	const markDeliveredM = markDeliveredMutation(orderId);
	const completeM = completeOrderMutation(orderId);

	const isRevise = $derived(canRevise(order.status));
	const isApprove = $derived(canApprove(order.status));
	const isTokenPay = $derived(canRecordTokenPayment(order.status));
	const isConfirm = $derived(canConfirm(order.status));
	const isPack = $derived(canMarkPacked(order.status));
	const isInvoice = $derived(canGenerateInvoice(order.status));
	const isDispatch = $derived(canDispatch(order.status));
	const isDeliver = $derived(canMarkDelivered(order.status));
	const isFullPay = $derived(canRecordFullPayment(order));
	const isComplete = $derived(canComplete(order));
	const isCancel = $derived(canCancel(order.status));
</script>

<div class="cluster cluster-tight" data-testid="order-actions">
	{#if isRevise}
		<Button variant="ghost" size="sm" onclick={onRevise} data-testid="action-revise">
			<Icon icon={Edit} size="sm" /> Revise
		</Button>
	{/if}

	{#if isApprove}
		<Button
			size="sm"
			loading={approveM.isPending}
			onclick={() => approveM.mutate({})}
			data-testid="action-approve"
		>
			<Icon icon={Check} size="sm" /> Approve quotation
		</Button>
	{/if}

	{#if isTokenPay}
		<Button size="sm" onclick={onRecordPayment} data-testid="action-record-token">
			Record token payment
		</Button>
	{/if}

	{#if isConfirm}
		<Button
			size="sm"
			loading={confirmM.isPending}
			onclick={() => confirmM.mutate()}
			data-testid="action-confirm"
		>
			<Icon icon={Check} size="sm" /> Confirm order
		</Button>
	{/if}

	{#if isPack}
		<Button size="sm" onclick={onMarkPacked} data-testid="action-mark-packed">
			<Icon icon={Package} size="sm" /> Mark packed
		</Button>
	{/if}

	{#if isInvoice}
		<Button
			size="sm"
			loading={generateInvoiceM.isPending}
			onclick={() => generateInvoiceM.mutate()}
			data-testid="action-generate-invoice"
		>
			Generate invoice
		</Button>
	{/if}

	{#if isDispatch}
		<Button size="sm" onclick={onDispatch} data-testid="action-dispatch">
			<Icon icon={Truck} size="sm" /> Dispatch
		</Button>
	{/if}

	{#if isDeliver}
		<Button
			size="sm"
			loading={markDeliveredM.isPending}
			onclick={() => markDeliveredM.mutate({})}
			data-testid="action-mark-delivered"
		>
			Mark delivered
		</Button>
	{/if}

	{#if isFullPay}
		<Button size="sm" onclick={onRecordPayment} data-testid="action-record-full">
			Record full payment
		</Button>
	{/if}

	{#if isComplete}
		<Button
			size="sm"
			loading={completeM.isPending}
			onclick={() => completeM.mutate()}
			data-testid="action-complete"
		>
			<Icon icon={CheckCircle2} size="sm" /> Complete
		</Button>
	{/if}

	{#if isCancel}
		<Button variant="ghost" size="sm" onclick={onCancel} data-testid="action-cancel">
			<Icon icon={X} size="sm" /> Cancel
		</Button>
	{/if}
</div>
