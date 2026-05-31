<!--
	OrderDetail — composes header + lifecycle stepper + tabs (Items /
	Revisions / Payments / Invoice / Credit Notes / Activity) using
	$ui/tabs and the new feature components.
-->
<script lang="ts">
	import { Alert, Card, Skeleton, Tabs } from '$ui';
	import { Icon, ChevronLeft } from '$icons';
	import { useUrlTab } from '$lib/hooks';
	import {
		orderCreditNotesQuery,
		orderDetailQuery,
		orderInvoiceQuery,
		orderPaymentsQuery,
		orderRevisionsQuery
	} from '$features/orders/queries';
	import { longDate } from '$features/orders/view-models';
	import OrderDetailHeader from './OrderDetailHeader.svelte';
	import OrderItemsTable from './OrderItemsTable.svelte';
	import QuotationRevisionsTimeline from './QuotationRevisionsTimeline.svelte';
	import PaymentsList from './PaymentsList.svelte';
	import InvoiceCard from './InvoiceCard.svelte';
	import CreditNotesList from './CreditNotesList.svelte';
	import ReviseQuotationDrawer from './ReviseQuotationDrawer.svelte';
	import RecordPaymentDialog from './RecordPaymentDialog.svelte';
	import MarkPackedDialog from './MarkPackedDialog.svelte';
	import DispatchDialog from './DispatchDialog.svelte';
	import CancelOrderDialog from './CancelOrderDialog.svelte';
	import type { BatchCatalogueEntry } from './OrderItemsEditor.svelte';
	import { resolve } from '$app/paths';

	type Props = { id: string };
	let { id }: Props = $props();

	const detail = $derived(orderDetailQuery(id));
	const order = $derived(detail.data ?? null);
	const revisions = $derived(orderRevisionsQuery(id));
	const payments = $derived(orderPaymentsQuery(id));
	const invoice = $derived(orderInvoiceQuery(id));
	const creditNotes = $derived(orderCreditNotesQuery(id));

	// ── Dialog open-state ───────────────────────────────────────────
	let reviseOpen = $state(false);
	let paymentOpen = $state(false);
	let packedOpen = $state(false);
	let dispatchOpen = $state(false);
	let cancelOpen = $state(false);

	// URL-synced tab — `?tab=payments` deep-links into the payments
	// list, and the browser back button restores the prior tab.
	const tab = useUrlTab('items', [
		'items',
		'revisions',
		'payments',
		'invoice',
		'credit_notes',
		'activity'
	]);

	/**
	 * Catalogue seed — derived from the order's existing items so the
	 * Revise drawer can show the current batches as initial options.
	 * A full search hits the inventory module gateway; that wire-up
	 * lands when Inventory ships the batch-search endpoint and is
	 * stubbed here as a no-op.
	 */
	const catalogue = $derived.by<BatchCatalogueEntry[]>(() => {
		if (!order) return [];
		return order.current_items.map((it) => ({
			value: `${it.product_id}:${it.batch_id}`,
			product_id: it.product_id,
			batch_id: it.batch_id,
			label: `${it.brand_name} · ${it.batch_number}`,
			description: it.pack_size ?? undefined,
			sale_rate: it.unit_price,
			gst_percentage: it.gst_percentage
		}));
	});
</script>

<div class="stack stack-relaxed">
	<a
		href={resolve('/orders')}
		class="cluster cluster-tight text-fg-muted hover:text-fg caption inline-flex"
	>
		<Icon icon={ChevronLeft} size="xs" /> Back to orders
	</a>

	{#if detail.isPending}
		<div class="stack stack-relaxed" aria-busy="true" data-testid="order-detail-loading">
			<Skeleton class="h-7 w-1/2" />
			<Skeleton class="h-32 w-full rounded-md" />
		</div>
	{:else if detail.isError || !order}
		<Alert variant="warning" title="Order not found">
			This order doesn't exist or you don't have access.
		</Alert>
	{:else}
		<OrderDetailHeader
			{order}
			onRevise={() => (reviseOpen = true)}
			onRecordPayment={() => (paymentOpen = true)}
			onMarkPacked={() => (packedOpen = true)}
			onDispatch={() => (dispatchOpen = true)}
			onCancel={() => (cancelOpen = true)}
		/>

		<Tabs.Root value={tab.value} onValueChange={tab.set}>
			<Tabs.List>
				<Tabs.Trigger value="items">Items</Tabs.Trigger>
				<Tabs.Trigger value="revisions">Revisions ({order.revisions.length})</Tabs.Trigger>
				<Tabs.Trigger value="payments">Payments ({order.payments.length})</Tabs.Trigger>
				<Tabs.Trigger value="invoice">Invoice</Tabs.Trigger>
				<Tabs.Trigger value="credit_notes">Credit Notes</Tabs.Trigger>
				<Tabs.Trigger value="activity">Activity</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="items">
				<Card.Root>
					<Card.Content>
						<OrderItemsTable
							items={order.current_items}
							currency={order.currency}
							subtotal={order.current_subtotal}
							discountTotal={order.current_discount_total ?? 0}
							gstTotal={order.current_gst_total}
							total={order.current_total}
						/>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="revisions">
				<Card.Root>
					<Card.Content>
						{#if revisions.isPending}
							<Skeleton class="h-12 w-full" />
						{:else}
							<QuotationRevisionsTimeline
								revisions={revisions.data?.items ?? order.revisions}
								currency={order.currency}
							/>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="payments">
				<Card.Root>
					<Card.Content>
						{#if payments.isPending}
							<Skeleton class="h-12 w-full" />
						{:else}
							<PaymentsList
								payments={payments.data?.items ?? order.payments}
								currency={order.currency}
							/>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="invoice">
				{#if invoice.isPending}
					<Skeleton class="h-32 w-full rounded-md" />
				{:else}
					<InvoiceCard invoice={invoice.data ?? null} currency={order.currency} />
				{/if}
			</Tabs.Content>

			<Tabs.Content value="credit_notes">
				<Card.Root>
					<Card.Content>
						{#if creditNotes.isPending}
							<Skeleton class="h-12 w-full" />
						{:else}
							<CreditNotesList
								creditNotes={creditNotes.data?.items ?? []}
								currency={order.currency}
							/>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="activity">
				<Card.Root>
					<Card.Header>
						<Card.Title>Activity</Card.Title>
						<Card.Description>
							Audit log appears here once the outbox-derived timeline ships.
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<dl class="text-fg flex flex-col gap-2 text-sm">
							{#if order.quotation_approved_at}
								<div>
									<dt class="caption text-fg-muted">Quotation approved</dt>
									<dd>{longDate(order.quotation_approved_at)}</dd>
								</div>
							{/if}
							{#if order.confirmed_at}
								<div>
									<dt class="caption text-fg-muted">Confirmed</dt>
									<dd>{longDate(order.confirmed_at)}</dd>
								</div>
							{/if}
							{#if order.packed_at}
								<div>
									<dt class="caption text-fg-muted">Packed</dt>
									<dd>{longDate(order.packed_at)}</dd>
								</div>
							{/if}
							{#if order.invoice_generated_at}
								<div>
									<dt class="caption text-fg-muted">Invoice generated</dt>
									<dd>{longDate(order.invoice_generated_at)}</dd>
								</div>
							{/if}
							{#if order.dispatched_at}
								<div>
									<dt class="caption text-fg-muted">Dispatched</dt>
									<dd>{longDate(order.dispatched_at)}</dd>
								</div>
							{/if}
							{#if order.delivered_at}
								<div>
									<dt class="caption text-fg-muted">Delivered</dt>
									<dd>{longDate(order.delivered_at)}</dd>
								</div>
							{/if}
							{#if order.completed_at}
								<div>
									<dt class="caption text-fg-muted">Completed</dt>
									<dd>{longDate(order.completed_at)}</dd>
								</div>
							{/if}
							{#if order.cancelled_at}
								<div>
									<dt class="caption text-fg-muted">Cancelled</dt>
									<dd>{longDate(order.cancelled_at)}</dd>
								</div>
								{#if order.cancel_reason}
									<div>
										<dt class="caption text-fg-muted">Cancel reason</dt>
										<dd class="body-base whitespace-pre-wrap">{order.cancel_reason}</dd>
									</div>
								{/if}
							{/if}
						</dl>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>

		<ReviseQuotationDrawer
			{order}
			bind:open={reviseOpen}
			onOpenChange={(o) => (reviseOpen = o)}
			{catalogue}
		/>
		<RecordPaymentDialog {order} bind:open={paymentOpen} onOpenChange={(o) => (paymentOpen = o)} />
		<MarkPackedDialog
			orderId={order.id}
			bind:open={packedOpen}
			onOpenChange={(o) => (packedOpen = o)}
		/>
		<DispatchDialog
			orderId={order.id}
			bind:open={dispatchOpen}
			onOpenChange={(o) => (dispatchOpen = o)}
		/>
		<CancelOrderDialog
			orderId={order.id}
			bind:open={cancelOpen}
			onOpenChange={(o) => (cancelOpen = o)}
		/>
	{/if}
</div>
