<script lang="ts">
	import { page as pageStore } from '$app/stores';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Badge, Button, EmptyState, Skeleton } from '$ui';
	import { Icon, Plus, ShoppingCart, ChevronUp, ChevronDown, ChevronsUpDown } from '$icons';
	import { ordersInfiniteListQuery, ordersKeys } from '$features/orders/queries';
	import {
		formatMoney,
		lineItemsLabel,
		shortDate,
		statusBadge,
		SAVED_VIEWS,
		type SavedViewId
	} from '$features/orders/view-models';
	import { orderStatusSchema, type OrderDto, type OrderStatus } from '$features/orders/schemas';
	import OrderFiltersBar from './OrderFiltersBar.svelte';
	import CreateOrderDrawer from './CreateOrderDrawer.svelte';
	import BulkUploadDrawer from './BulkUploadDrawer.svelte';
	import BulkActionsBar from './BulkActionsBar.svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { cn } from '$lib/utils/cn';

	/**
	 * OrdersList — list + cursor-paginated infinite scroll + filters +
	 * bulk-select + keyboard navigation.
	 *
	 * URL is the source of truth for filter state. Saved views and
	 * filter chips both write through the same URL writer.
	 */

	const qc = useQueryClient();

	// ── URL state ────────────────────────────────────────────────────
	const search = $derived($pageStore.url.searchParams);
	const q = $derived(search.get('q') ?? '');
	const statuses = $derived(parseStatusParam(search.getAll('status')));
	const sortParam = $derived(search.get('sort') ?? 'placed_at:desc');
	const placedFrom = $derived(search.get('placed_from') ?? undefined);
	const placedTo = $derived(search.get('placed_to') ?? undefined);

	function parseStatusParam(raw: string[]): OrderStatus[] {
		const valid = orderStatusSchema.options as readonly OrderStatus[];
		return raw.filter((v): v is OrderStatus => valid.includes(v as OrderStatus));
	}

	const sort = $derived(parseSort(sortParam));
	function parseSort(s: string): { column: string; order: 'asc' | 'desc' } {
		const [column, order] = s.split(':');
		return { column: column ?? 'placed_at', order: order === 'asc' ? 'asc' : 'desc' };
	}

	// ── Drawer / selection state ─────────────────────────────────────
	let createOpen = $state(false);
	let bulkUploadOpen = $state(false);
	let selectedIds: string[] = $state([]);
	let focusedRowIdx = $state(-1);

	// ── Query ────────────────────────────────────────────────────────
	const listQuery = ordersInfiniteListQuery(() => ({
		q: q || undefined,
		status: statuses.length ? statuses : undefined,
		placed_from: placedFrom,
		placed_to: placedTo,
		sort: sortParam
	}));

	const allOrders = $derived(listQuery.data ? listQuery.data.pages.flatMap((p) => p.items) : []);
	const isInitialLoading = $derived(listQuery.isPending);
	const isError = $derived(listQuery.isError);

	// ── URL writers ──────────────────────────────────────────────────
	function navigate(params: SvelteURLSearchParams) {
		const qs = params.toString();
		goto(qs ? `?${qs}` : '?', { replaceState: true, keepFocus: true, noScroll: true });
	}

	function setParam(key: string, value: string | string[] | undefined) {
		const params = new SvelteURLSearchParams(search.toString());
		params.delete(key);
		if (Array.isArray(value)) {
			for (const v of value) params.append(key, v);
		} else if (value && value.length > 0) {
			params.set(key, value);
		}
		navigate(params);
	}

	function clearAllFilters() {
		const params = new SvelteURLSearchParams();
		// Keep sort intact when clearing filters.
		if (sortParam !== 'placed_at:desc') params.set('sort', sortParam);
		navigate(params);
	}

	function applySavedView(viewId: SavedViewId) {
		const view = SAVED_VIEWS.find((v) => v.id === viewId);
		if (!view) return;
		const params = new SvelteURLSearchParams();
		for (const [k, val] of Object.entries(view.params)) {
			if (Array.isArray(val)) {
				for (const v of val) params.append(k, v);
			} else {
				params.set(k, val);
			}
		}
		navigate(params);
	}

	const activeView = $derived(detectActiveView());
	function detectActiveView(): SavedViewId {
		if (statuses.length === 1 && statuses[0] === 'draft' && !placedFrom) return 'draft';
		if (statuses.length === 1 && statuses[0] === 'confirmed' && !placedFrom)
			return 'awaiting_shipment';
		if (statuses.length === 1 && statuses[0] === 'shipped' && !placedFrom) return 'in_transit';
		if (statuses.length === 0 && placedFrom) return 'last_30_days';
		return 'all';
	}

	function onSortClick(column: string) {
		const nextOrder = sort.column === column && sort.order === 'asc' ? 'desc' : 'asc';
		setParam('sort', `${column}:${nextOrder}`);
	}

	// ── Selection ────────────────────────────────────────────────────
	function toggleSelect(id: string) {
		selectedIds = selectedIds.includes(id)
			? selectedIds.filter((x) => x !== id)
			: [...selectedIds, id];
	}
	const allVisibleSelected = $derived(
		allOrders.length > 0 && allOrders.every((o) => selectedIds.includes(o.id))
	);
	function toggleSelectAll() {
		if (allVisibleSelected) {
			selectedIds = [];
		} else {
			selectedIds = allOrders.map((o) => o.id);
		}
	}

	// ── Row navigation ───────────────────────────────────────────────
	function openDetail(o: OrderDto) {
		// Prefetch detail for instant nav.
		qc.setQueryData(ordersKeys.detail(o.id), o);
		goto(`/orders/${o.id}`);
	}

	// ── Keyboard navigation ──────────────────────────────────────────
	function onKey(e: KeyboardEvent) {
		// Ignore when typing in inputs / contenteditable.
		const el = e.target as HTMLElement | null;
		if (!el) return;
		if (
			el.tagName === 'INPUT' ||
			el.tagName === 'TEXTAREA' ||
			el.tagName === 'SELECT' ||
			el.isContentEditable
		)
			return;
		// Don't hijack keys while a drawer/dialog is open.
		if (createOpen || bulkUploadOpen) return;
		if (allOrders.length === 0) return;

		if (e.key === 'j') {
			e.preventDefault();
			focusedRowIdx = Math.min(focusedRowIdx + 1, allOrders.length - 1);
			focusRow(focusedRowIdx);
		} else if (e.key === 'k') {
			e.preventDefault();
			focusedRowIdx = Math.max(focusedRowIdx - 1, 0);
			focusRow(focusedRowIdx);
		} else if (e.key === 'Enter' && focusedRowIdx >= 0) {
			e.preventDefault();
			openDetail(allOrders[focusedRowIdx]);
		} else if (e.key === 'x' && focusedRowIdx >= 0) {
			e.preventDefault();
			toggleSelect(allOrders[focusedRowIdx].id);
		}
	}
	function focusRow(idx: number) {
		const el = document.querySelector<HTMLElement>(`[data-row-index="${idx}"]`);
		el?.focus();
	}

	// ── Infinite-scroll sentinel ─────────────────────────────────────
	let sentinel: HTMLDivElement | null = $state(null);
	$effect(() => {
		if (!sentinel) return;
		const target = sentinel;
		const obs = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
						listQuery.fetchNextPage();
					}
				}
			},
			{ rootMargin: '120px' }
		);
		obs.observe(target);
		return () => obs.disconnect();
	});

	const sortColumns: Array<{ id: string; label: string; sortBy: string }> = [
		{ id: 'order_number', label: 'Order #', sortBy: 'order_number' },
		{ id: 'placed_at', label: 'Placed', sortBy: 'placed_at' },
		{ id: 'total', label: 'Total', sortBy: 'total' }
	];

	function sortIcon(col: string) {
		if (sort.column !== col) return ChevronsUpDown;
		return sort.order === 'asc' ? ChevronUp : ChevronDown;
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Orders</h1>
			<p class="caption text-fg-muted">Manage orders end-to-end: confirm, ship, deliver, refund.</p>
		</div>
		<div class="cluster cluster-tight">
			<Button variant="ghost" onclick={() => (bulkUploadOpen = true)}>
				<Icon icon={Plus} size="sm" /> Bulk upload
			</Button>
			<Button onclick={() => (createOpen = true)}>
				<Icon icon={Plus} size="sm" /> New order
			</Button>
		</div>
	</header>

	<!-- Saved views -->
	<nav aria-label="Saved views" class="border-border border-b">
		<ul class="cluster gap-0" style="list-style:none;margin:0;padding:0;">
			{#each SAVED_VIEWS as view (view.id)}
				{@const active = activeView === view.id}
				<li>
					<button
						type="button"
						aria-current={active ? 'page' : undefined}
						onclick={() => applySavedView(view.id)}
						data-testid={`view-${view.id}`}
						class={cn(
							'label -mb-px inline-block border-b-2 px-4 py-2 transition-colors',
							'focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
							'focus-visible:ring-focus-ring',
							active
								? 'border-primary text-primary'
								: 'text-fg-muted hover:text-fg border-transparent'
						)}
					>
						{view.label}
					</button>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Filters -->
	<OrderFiltersBar
		{q}
		{statuses}
		onQChange={(next) => setParam('q', next)}
		onStatusesChange={(next) => setParam('status', next)}
		onClearAll={clearAllFilters}
	/>

	<!-- Table -->
	{#if isInitialLoading}
		<div class="stack stack-tight" aria-busy="true" data-testid="orders-loading">
			{#each [0, 1, 2, 3, 4] as i (i)}
				<Skeleton class="h-12 w-full" />
			{/each}
		</div>
	{:else if isError}
		<div class="border-danger-500 text-danger-700 rounded-md border p-4">
			Couldn't load orders. {listQuery.error?.message ?? ''}
		</div>
	{:else if allOrders.length === 0}
		<EmptyState
			icon={ShoppingCart}
			title="No orders yet"
			description="Create an order to get started, or bulk upload a CSV."
		>
			{#snippet action()}
				<Button onclick={() => (createOpen = true)}>
					<Icon icon={Plus} size="sm" /> Create order
				</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-left" data-testid="orders-table">
				<thead>
					<tr class="border-border border-b">
						<th class="w-10 px-3 py-3">
							<input
								type="checkbox"
								aria-label="Select all"
								checked={allVisibleSelected}
								onchange={toggleSelectAll}
								data-testid="select-all"
							/>
						</th>
						{#each sortColumns as col (col.id)}
							<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
								<button
									type="button"
									class="cluster cluster-tight hover:text-fg inline-flex items-center gap-1"
									onclick={() => onSortClick(col.sortBy)}
									data-testid={`sort-${col.id}`}
								>
									{col.label}
									<Icon icon={sortIcon(col.sortBy)} size="xs" />
								</button>
							</th>
						{/each}
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Customer
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase md:table-cell"
						>
							Items
						</th>
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Status
						</th>
					</tr>
				</thead>
				<tbody>
					{#each allOrders as order, idx (order.id)}
						{@const sb = statusBadge(order.status)}
						{@const isSelected = selectedIds.includes(order.id)}
						<tr
							class={cn(
								'border-border hover:bg-bg-muted cursor-pointer border-b transition-colors',
								isSelected && 'bg-primary-soft/30'
							)}
							data-row-index={idx}
							data-testid={`order-row-${order.id}`}
							tabindex="0"
							onclick={() => openDetail(order)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									openDetail(order);
								}
							}}
						>
							<td class="w-10 px-3 py-3" onclick={(e) => e.stopPropagation()}>
								<input
									type="checkbox"
									aria-label={`Select order ${order.order_number}`}
									checked={isSelected}
									data-testid={`row-select-${order.id}`}
									onchange={() => toggleSelect(order.id)}
								/>
							</td>
							<td class="px-3 py-3">
								<code class="body-sm text-fg">{order.order_number}</code>
							</td>
							<td class="text-fg-muted caption px-3 py-3">{shortDate(order.placed_at)}</td>
							<td class="body-sm text-fg px-3 py-3 tabular-nums">
								{formatMoney(order.total, order.currency)}
							</td>
							<td class="body-sm text-fg px-3 py-3">{order.customer_name}</td>
							<td class="text-fg-muted caption hidden px-3 py-3 md:table-cell">
								{lineItemsLabel(order.items)}
							</td>
							<td class="px-3 py-3">
								<Badge variant={sb.variant} style="soft" size="sm">{sb.label}</Badge>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Infinite-scroll sentinel -->
		<div bind:this={sentinel} class="py-4 text-center">
			{#if listQuery.isFetchingNextPage}
				<span class="caption text-fg-muted" aria-live="polite">Loading more…</span>
			{:else if !listQuery.hasNextPage && allOrders.length > 5}
				<span class="caption text-fg-subtle">End of results</span>
			{/if}
		</div>
	{/if}
</div>

<BulkActionsBar {selectedIds} visibleOrders={allOrders} onClear={() => (selectedIds = [])} />

<CreateOrderDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<BulkUploadDrawer bind:open={bulkUploadOpen} onOpenChange={(o) => (bulkUploadOpen = o)} />
