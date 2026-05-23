<script lang="ts">
	import { goto } from '$app/navigation';
	import { Alert, Badge, Button, Card, CopyButton, Skeleton, ConfirmDialog } from '$ui';
	import { Icon, ChevronLeft, Edit, Trash2 } from '$icons';
	import { orderDetailQuery, deleteOrderMutation } from '$features/orders/queries';
	import {
		formatMoney,
		longDate,
		statusBadge,
		canEdit,
		canDelete
	} from '$features/orders/view-models';
	import OrderStatusActions from './OrderStatusActions.svelte';
	import EditOrderDrawer from './EditOrderDrawer.svelte';

	type Props = { id: string };
	let { id }: Props = $props();

	const query = $derived(orderDetailQuery(id));
	const order = $derived(query.data ?? null);

	const deleteM = deleteOrderMutation();

	let editOpen = $state(false);
	let deleteOpen = $state(false);

	async function onConfirmDelete() {
		await new Promise<void>((resolve) =>
			deleteM.mutate(id, {
				onSuccess: () => {
					deleteOpen = false;
					goto('/orders');
					resolve();
				},
				onError: () => resolve()
			})
		);
	}

	// ── Keyboard shortcut: `e` to edit when editable ────────────────
	function onKey(e: KeyboardEvent) {
		const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
		if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
		if (!order) return;
		if (e.key === 'e' && canEdit(order.status)) {
			e.preventDefault();
			editOpen = true;
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="stack stack-relaxed">
	<a href="/orders" class="cluster cluster-tight text-fg-muted hover:text-fg caption inline-flex">
		<Icon icon={ChevronLeft} size="xs" /> Back to orders
	</a>

	{#if query.isPending}
		<div class="stack stack-relaxed" aria-busy="true" data-testid="order-detail-loading">
			<Skeleton class="h-7 w-1/2" />
			<Skeleton class="h-32 w-full rounded-md" />
		</div>
	{:else if query.isError || !order}
		<Alert variant="warning" title="Order not found">
			This order doesn't exist or you don't have access.
		</Alert>
	{:else}
		{@const sb = statusBadge(order.status)}
		<header class="cluster cluster-spread items-start">
			<div class="stack stack-tight">
				<div class="cluster cluster-tight">
					<h1 class="h1" data-testid="order-number">Order {order.order_number}</h1>
					<span data-testid="order-status-badge">
						<Badge variant={sb.variant} style="soft" size="md">{sb.label}</Badge>
					</span>
				</div>
				<div class="cluster cluster-tight">
					<code class="caption text-fg-subtle">{order.id}</code>
					<CopyButton value={order.id} label="Copy order ID" />
				</div>
			</div>
			<div class="cluster cluster-tight">
				{#if canEdit(order.status)}
					<Button variant="ghost" size="sm" onclick={() => (editOpen = true)}>
						<Icon icon={Edit} size="sm" /> Edit
					</Button>
				{/if}
				{#if canDelete(order.status)}
					<Button variant="ghost" size="sm" onclick={() => (deleteOpen = true)}>
						<Icon icon={Trash2} size="sm" /> Delete
					</Button>
				{/if}
				<OrderStatusActions {order} />
			</div>
		</header>

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<!-- Left column: customer + items -->
			<div class="stack stack-relaxed lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Customer</Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="grid grid-cols-2 gap-x-6 gap-y-3">
							<div>
								<dt class="caption text-fg-muted">Name</dt>
								<dd class="body-base">{order.customer_name}</dd>
							</div>
							{#if order.customer_email}
								<div>
									<dt class="caption text-fg-muted">Email</dt>
									<dd class="body-base">{order.customer_email}</dd>
								</div>
							{/if}
							<div class="col-span-2">
								<dt class="caption text-fg-muted">Lead</dt>
								<dd>
									<a
										href={`/leads/${order.customer_lead_id}`}
										class="body-base text-primary hover:underline"
									>
										View lead profile
									</a>
								</dd>
							</div>
						</dl>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Line items</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="overflow-x-auto">
							<table class="w-full text-left text-sm">
								<thead>
									<tr class="border-border text-fg-muted border-b">
										<th class="px-2 py-2 text-xs uppercase">SKU</th>
										<th class="px-2 py-2 text-xs uppercase">Name</th>
										<th class="px-2 py-2 text-right text-xs uppercase">Qty</th>
										<th class="px-2 py-2 text-right text-xs uppercase">Unit price</th>
										<th class="px-2 py-2 text-right text-xs uppercase">Line total</th>
									</tr>
								</thead>
								<tbody>
									{#each order.items as item (item.sku)}
										<tr class="border-border border-b">
											<td class="px-2 py-2"><code class="caption">{item.sku}</code></td>
											<td class="px-2 py-2">{item.name}</td>
											<td class="px-2 py-2 text-right">{item.quantity}</td>
											<td class="px-2 py-2 text-right tabular-nums">
												{formatMoney(item.unit_price, order.currency)}
											</td>
											<td class="px-2 py-2 text-right tabular-nums">
												{formatMoney(item.line_total, order.currency)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</Card.Content>
				</Card.Root>

				{#if order.notes}
					<Card.Root>
						<Card.Header>
							<Card.Title>Notes</Card.Title>
						</Card.Header>
						<Card.Content>
							<p class="body-base text-fg whitespace-pre-wrap">{order.notes}</p>
						</Card.Content>
					</Card.Root>
				{/if}

				<Card.Root>
					<Card.Header>
						<Card.Title>Activity</Card.Title>
						<Card.Description>Audit log appears here once available.</Card.Description>
					</Card.Header>
					<Card.Content>
						<p class="caption text-fg-subtle">—</p>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Right column: totals + timestamps -->
			<div class="stack stack-relaxed">
				<Card.Root>
					<Card.Header>
						<Card.Title>Totals</Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="text-fg flex flex-col gap-1 text-sm tabular-nums">
							<div class="cluster cluster-spread">
								<dt class="text-fg-muted">Subtotal</dt>
								<dd>{formatMoney(order.subtotal, order.currency)}</dd>
							</div>
							{#if (order.discount_total ?? 0) > 0}
								<div class="cluster cluster-spread">
									<dt class="text-fg-muted">Discount</dt>
									<dd>−{formatMoney(order.discount_total ?? 0, order.currency)}</dd>
								</div>
							{/if}
							<div class="cluster cluster-spread">
								<dt class="text-fg-muted">Tax</dt>
								<dd>{formatMoney(order.tax_total, order.currency)}</dd>
							</div>
							<div class="border-border cluster cluster-spread border-t pt-2">
								<dt class="label text-fg">Total</dt>
								<dd class="label text-fg" data-testid="order-total">
									{formatMoney(order.total, order.currency)}
								</dd>
							</div>
						</dl>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Timestamps</Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="text-fg flex flex-col gap-2 text-sm">
							<div>
								<dt class="caption text-fg-muted">Placed</dt>
								<dd>{longDate(order.placed_at)}</dd>
							</div>
							{#if order.expected_delivery_at}
								<div>
									<dt class="caption text-fg-muted">Expected delivery</dt>
									<dd>{longDate(order.expected_delivery_at)}</dd>
								</div>
							{/if}
							{#if order.delivered_at}
								<div>
									<dt class="caption text-fg-muted">Delivered</dt>
									<dd>{longDate(order.delivered_at)}</dd>
								</div>
							{/if}
							{#if order.cancelled_at}
								<div>
									<dt class="caption text-fg-muted">Cancelled</dt>
									<dd>{longDate(order.cancelled_at)}</dd>
								</div>
							{/if}
							{#if order.cancel_reason}
								<div>
									<dt class="caption text-fg-muted">Cancel reason</dt>
									<dd class="body-base whitespace-pre-wrap">{order.cancel_reason}</dd>
								</div>
							{/if}
							{#if order.tracking_number}
								<div>
									<dt class="caption text-fg-muted">Tracking</dt>
									<dd><code class="body-sm">{order.tracking_number}</code></dd>
								</div>
							{/if}
						</dl>
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<EditOrderDrawer bind:open={editOpen} {order} onOpenChange={(o) => (editOpen = o)} />

		<ConfirmDialog
			bind:open={deleteOpen}
			title="Delete order"
			description="Permanently delete this draft order. This cannot be undone."
			confirmLabel="Delete order"
			variant="danger"
			loading={deleteM.isPending}
			onConfirm={onConfirmDelete}
		/>
	{/if}
</div>
