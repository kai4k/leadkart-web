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
	import { ACTION, session } from '$features/auth';
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

	// Mutations whose handlers are 100% local (no extra input dialog).
	const approveM = approveQuotationMutation();
	const confirmM = confirmOrderMutation();
	const generateInvoiceM = generateInvoiceMutation();
	const markDeliveredM = markDeliveredMutation();
	const completeM = completeOrderMutation();

	// Each group shows only with the permission Go's route for it needs (and never in an
	// operator's tenant context, where every write is read-only).
	const mayQuote = $derived(session.canAny(...ACTION.quotationManage));
	const mayOrder = $derived(session.canAny(...ACTION.orderManage));
	const mayPay = $derived(session.canAny(...ACTION.paymentRecord));
	const mayDispatch = $derived(session.canAny(...ACTION.dispatchManage));

	const isRevise = $derived(mayQuote && canRevise(order.status));
	const isApprove = $derived(mayQuote && canApprove(order.status));
	const isTokenPay = $derived(mayPay && canRecordTokenPayment(order.status));
	const isConfirm = $derived(mayOrder && canConfirm(order.status));
	const isPack = $derived(mayOrder && canMarkPacked(order.status));
	const isInvoice = $derived(mayOrder && canGenerateInvoice(order.status));
	const isDispatch = $derived(mayDispatch && canDispatch(order.status));
	const isDeliver = $derived(mayDispatch && canMarkDelivered(order.status));
	const isFullPay = $derived(mayPay && canRecordFullPayment(order));
	const isComplete = $derived(mayOrder && canComplete(order));
	const isCancel = $derived(mayOrder && canCancel(order.status));
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
			onclick={() => approveM.mutate({ id: order.id })}
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
			onclick={() => confirmM.mutate({ id: order.id })}
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
			onclick={() => generateInvoiceM.mutate({ id: order.id })}
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
			onclick={() => markDeliveredM.mutate({ id: order.id })}
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
			onclick={() => completeM.mutate({ id: order.id })}
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
