<!--
	OrdersList — page-level composition of the foundation primitives:
	  - ResourceListPage shell (title, toolbar, tabs, filters, bulk bar)
	  - DataTable rendering the list rows (server-paginated)
	  - useUrlFilters as the source of truth for filter state
	  - useSavedViews for canned view tabs
	  - useBulkSelection for the bulk-action bar
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ResourceListPage, type FilterBarField, type BulkAction } from '$lib/components/data';
	import { DataTable, EmptyState, type DataTableColumn } from '$ui';
	import { Plus, ShoppingCart, Trash2, X } from '$icons';
	import type { Component } from 'svelte';
	import { createBulkSelection, createSavedViews, createUrlFilters } from '$lib/hooks';
	import { ordersInfiniteQuery, bulkOrderActionMutation } from '$features/orders/queries';
	import {
		formatMoney,
		lineItemsLabel,
		shortDate,
		statusBadge
	} from '$features/orders/view-models';
	import { orderFilterFields, type OrderListFilters } from './OrderFilters.svelte';
	import OrderStatusBadge from './OrderStatusBadge.svelte';
	import type { OrderDto } from '$features/orders/schemas';
	import { getListErrorMessage } from '$api/errors';

	// ── URL state ────────────────────────────────────────────────────
	const urlFilters = createUrlFilters<OrderListFilters>({
		q: { type: 'string', label: 'Search' },
		status: { type: 'string[]', label: 'Status' },
		customer_lead_id: { type: 'string', label: 'Customer' },
		placed_from: { type: 'string', label: 'Placed from' },
		placed_to: { type: 'string', label: 'Placed to' },
		total_min: { type: 'string', label: 'Min total' },
		total_max: { type: 'string', label: 'Max total' },
		sort: { type: 'string', label: 'Sort' }
	});

	const savedViews = createSavedViews<OrderListFilters>(
		[
			{ id: 'all', label: 'All', filters: { status: [] } },
			{
				id: 'open_quotations',
				label: 'Open quotations',
				filters: { status: ['quotation_draft', 'quotation_revised', 'quotation_approved'] }
			},
			{
				id: 'awaiting_payment',
				label: 'Awaiting payment',
				filters: { status: ['quotation_approved'] }
			},
			{
				id: 'in_fulfillment',
				label: 'In fulfillment',
				filters: { status: ['confirmed', 'packed', 'invoice_generated'] }
			},
			{ id: 'shipped', label: 'Shipped', filters: { status: ['dispatched'] } },
			{ id: 'delivered', label: 'Delivered', filters: { status: ['delivered', 'complete'] } },
			{ id: 'cancelled', label: 'Cancelled', filters: { status: ['cancelled'] } }
		],
		urlFilters
	);

	const selection = createBulkSelection<OrderDto>();

	// ── Query ────────────────────────────────────────────────────────
	const listQuery = ordersInfiniteQuery(() => {
		const f = urlFilters.filters;
		return {
			q: typeof f.q === 'string' && f.q ? f.q : undefined,
			status:
				Array.isArray(f.status) && f.status.length ? (f.status as OrderDto['status'][]) : undefined,
			customer_lead_id:
				typeof f.customer_lead_id === 'string' && f.customer_lead_id
					? f.customer_lead_id
					: undefined,
			placed_from: typeof f.placed_from === 'string' && f.placed_from ? f.placed_from : undefined,
			placed_to: typeof f.placed_to === 'string' && f.placed_to ? f.placed_to : undefined,
			total_min: typeof f.total_min === 'string' && f.total_min ? Number(f.total_min) : undefined,
			total_max: typeof f.total_max === 'string' && f.total_max ? Number(f.total_max) : undefined,
			sort: typeof f.sort === 'string' && f.sort ? f.sort : 'placed_at:desc'
		};
	});

	const orders: OrderDto[] = $derived(
		listQuery.data ? listQuery.data.pages.flatMap((p) => p.items) : []
	);

	const tableState = $derived(
		listQuery.isPending ? 'loading' : listQuery.isError ? 'error' : 'ready'
	);

	function openDetail(o: OrderDto) {
		goto(resolve(`/orders/${o.id}`));
	}

	// ── Bulk actions ─────────────────────────────────────────────────
	const bulkM = bulkOrderActionMutation();

	const bulkActions: BulkAction[] = [
		{
			id: 'delete_drafts',
			label: 'Delete drafts',
			icon: Trash2 as unknown as Component,
			variant: 'danger',
			confirm: {
				title: 'Delete selected drafts',
				description: 'Only quotation drafts will be deleted; others are skipped.',
				confirmLabel: 'Delete drafts'
			},
			onClick: async () => {
				await new Promise<void>((resolve) =>
					bulkM.mutate(
						{ ids: Array.from(selection.selected), action: 'delete_drafts' },
						{ onSettled: () => resolve() }
					)
				);
				selection.clear();
			}
		},
		{
			id: 'cancel',
			label: 'Cancel selected',
			icon: X as unknown as Component,
			variant: 'danger',
			confirm: {
				title: 'Cancel selected orders',
				description: 'Cancellation triggers stock unreserve + credit notes per cancelled invoice.',
				confirmLabel: 'Cancel orders'
			},
			onClick: async () => {
				await new Promise<void>((resolve) =>
					bulkM.mutate(
						{ ids: Array.from(selection.selected), action: 'cancel', reason: 'Bulk cancel' },
						{ onSettled: () => resolve() }
					)
				);
				selection.clear();
			}
		}
	];

	// ── Table columns ────────────────────────────────────────────────
	const columns: DataTableColumn<OrderDto>[] = [
		{
			id: 'select',
			header: '',
			class: 'w-10',
			selectLabel: (o) => `Select ${o.order_number}`
		},
		{ id: 'order_number', header: 'Order #', accessor: 'order_number', sortBy: 'order_number' },
		{
			id: 'placed_at',
			header: 'Created',
			accessor: (r) => shortDate(r.created_at),
			sortBy: 'created_at',
			hideBelow: 'md'
		},
		{
			id: 'customer',
			header: 'Customer',
			accessor: 'customer_name'
		},
		{
			id: 'items',
			header: 'Items',
			accessor: (r) => lineItemsLabel(r.current_items),
			hideBelow: 'lg'
		},
		{
			id: 'total',
			header: 'Total',
			accessor: (r) => formatMoney(r.current_total, r.currency),
			sortBy: 'current_total',
			class: 'text-end tabular-nums'
		},
		{
			id: 'status',
			header: 'Status',
			accessor: (r) => statusBadge(r.status).label,
			cell: statusCell
		}
	];

	const sort = $derived.by<{ column: string; order: 'asc' | 'desc' } | null>(() => {
		const raw = typeof urlFilters.filters.sort === 'string' ? urlFilters.filters.sort : '';
		if (!raw) return { column: 'created_at', order: 'desc' };
		const [col, ord] = raw.split(':');
		return { column: col ?? 'created_at', order: ord === 'asc' ? 'asc' : 'desc' };
	});

	function onSortChange(column: string, order: 'asc' | 'desc') {
		urlFilters.setFilter('sort', `${column}:${order}`);
	}

	// ── Filter config ────────────────────────────────────────────────
	const filterConfig: FilterBarField[] = orderFilterFields;

	const listErrorCopy = $derived(getListErrorMessage(listQuery.error, 'orders'));
</script>

{#snippet statusCell(row: OrderDto)}
	<OrderStatusBadge status={row.status} />
{/snippet}

{#snippet emptyState()}
	<EmptyState
		icon={ShoppingCart}
		title="No orders yet"
		description="Create a quotation when a CRM lead asks for one."
	/>
{/snippet}

{#snippet footer()}
	{#if listQuery.isFetchingNextPage}
		<p class="caption text-fg-muted py-4 text-center" aria-live="polite">Loading more…</p>
	{:else if !listQuery.hasNextPage && orders.length > 0}
		<p class="caption text-fg-subtle py-4 text-center">End of results</p>
	{/if}
{/snippet}

<ResourceListPage
	title="Orders"
	subtitle="Quotation → confirmed → dispatched → delivered. State-machine driven."
	primaryAction={{
		label: 'New quotation',
		icon: Plus as unknown as Component,
		onClick: () => goto(resolve('/orders/new'))
	}}
	{savedViews}
	filters={{ config: filterConfig, instance: urlFilters }}
	bulk={{ selection, actions: bulkActions }}
	{footer}
>
	<DataTable.Root
		{columns}
		rows={orders}
		rowKey={(r: OrderDto) => r.id}
		state={orders.length === 0 && tableState === 'ready' ? 'empty' : tableState}
		error={listErrorCopy}
		onRowClick={openDetail}
		{selection}
		{sort}
		{onSortChange}
		{emptyState}
	/>
</ResourceListPage>
