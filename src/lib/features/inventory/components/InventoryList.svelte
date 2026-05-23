<script lang="ts">
	import { onMount } from 'svelte';
	import { page as pageStore } from '$app/stores';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams, SvelteSet } from 'svelte/reactivity';
	import { Alert, Badge, Button, ConfirmDialog, Dropdown, EmptyState, Skeleton } from '$ui';
	import { Icon, Plus, Boxes, MoreVertical, Edit, Trash2, Pause, Check, RotateCcw } from '$icons';
	import {
		inventoryListQuery,
		bulkInventoryActionMutation,
		deleteInventoryItemMutation
	} from '$features/inventory/queries';
	import { activeBadge, formatPrice } from '$features/inventory/view-models';
	import type { InventoryItemDto as Item } from '$features/inventory/schemas';
	import type { InventorySort, ListInventoryParams } from '$features/inventory/api';
	import StockLevelBadge from './StockLevelBadge.svelte';
	import InventoryFiltersBar from './InventoryFiltersBar.svelte';
	import BulkActionsBar from './BulkActionsBar.svelte';
	import CreateItemDrawer from './CreateItemDrawer.svelte';
	import EditItemDrawer from './EditItemDrawer.svelte';
	import AdjustStockDialog from './AdjustStockDialog.svelte';
	import BulkUploadDrawer from './BulkUploadDrawer.svelte';

	/**
	 * Inventory list — the catalog view.
	 *
	 * URL-driven filter state (q, low_stock, is_active, sort, view), bulk
	 * select with sticky action bar, cursor infinite scroll via
	 * IntersectionObserver sentinel, keyboard navigation (j/k/Enter/e/a/x).
	 *
	 * Saved views (?view=...) preset multiple filters at once:
	 *   - all (default)
	 *   - low: low_stock=true
	 *   - out: low_stock=true (server filter "low" includes out)
	 *   - inactive: is_active=false
	 *   - recent: sort=created_at:desc
	 */

	// ── URL state ──────────────────────────────────────────────────────
	const q = $derived($pageStore.url.searchParams.get('q') ?? '');
	const lowStock = $derived($pageStore.url.searchParams.get('low_stock') === 'true');
	const isActiveParam = $derived($pageStore.url.searchParams.get('is_active'));
	const activeFilter = $derived<'all' | 'active' | 'inactive'>(
		isActiveParam === 'true' ? 'active' : isActiveParam === 'false' ? 'inactive' : 'all'
	);
	const sort = $derived(($pageStore.url.searchParams.get('sort') ?? 'name:asc') as InventorySort);
	const view = $derived($pageStore.url.searchParams.get('view') ?? 'all');

	function pushParams(mutate: (p: SvelteURLSearchParams) => void) {
		const params = new SvelteURLSearchParams($pageStore.url.searchParams.toString());
		mutate(params);
		goto(`?${params}`, { replaceState: true, keepFocus: true });
	}

	function onSearchChange(v: string) {
		pushParams((p) => {
			if (v) p.set('q', v);
			else p.delete('q');
		});
	}
	function onLowStockToggle() {
		pushParams((p) => {
			if (lowStock) p.delete('low_stock');
			else p.set('low_stock', 'true');
		});
	}
	function onActiveFilterChange(v: 'all' | 'active' | 'inactive') {
		pushParams((p) => {
			if (v === 'all') p.delete('is_active');
			else p.set('is_active', v === 'active' ? 'true' : 'false');
		});
	}
	function onSortChange(v: string) {
		pushParams((p) => p.set('sort', v));
	}
	function onClearAll() {
		pushParams((p) => {
			p.delete('q');
			p.delete('low_stock');
			p.delete('is_active');
			p.delete('view');
		});
	}

	const SAVED_VIEWS: Array<{
		id: string;
		label: string;
		apply: (p: SvelteURLSearchParams) => void;
	}> = [
		{
			id: 'all',
			label: 'All',
			apply: (p) => {
				p.delete('low_stock');
				p.delete('is_active');
				p.set('view', 'all');
			}
		},
		{
			id: 'low',
			label: 'Low stock',
			apply: (p) => {
				p.set('low_stock', 'true');
				p.delete('is_active');
				p.set('view', 'low');
			}
		},
		{
			id: 'inactive',
			label: 'Inactive',
			apply: (p) => {
				p.set('is_active', 'false');
				p.delete('low_stock');
				p.set('view', 'inactive');
			}
		},
		{
			id: 'recent',
			label: 'Recently added',
			apply: (p) => {
				p.set('sort', 'created_at:desc');
				p.set('view', 'recent');
			}
		}
	];
	function setSavedView(id: string) {
		const v = SAVED_VIEWS.find((x) => x.id === id);
		if (!v) return;
		pushParams((p) => v.apply(p));
	}

	// ── Query ──────────────────────────────────────────────────────────
	const listParams: ListInventoryParams = $derived({
		q: q || undefined,
		low_stock: lowStock || undefined,
		is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
		sort
	});
	const query = $derived(inventoryListQuery(listParams));

	const items = $derived.by(() => {
		const pages = query.data?.pages ?? [];
		return pages.flatMap((p) => p.items);
	});

	// ── Bulk select ────────────────────────────────────────────────────
	// SvelteSet is self-reactive — mutate it in place (no $state wrapper).
	const selected = new SvelteSet<string>();

	const allSelected = $derived(items.length > 0 && items.every((i) => selected.has(i.id)));

	function toggleSelect(id: string) {
		if (selected.has(id)) selected.delete(id);
		else selected.add(id);
	}
	function toggleSelectAll() {
		if (allSelected) {
			selected.clear();
		} else {
			selected.clear();
			for (const i of items) selected.add(i.id);
		}
	}
	function clearSelection() {
		selected.clear();
	}

	const bulkMutation = bulkInventoryActionMutation();
	function doBulk(action: 'activate' | 'deactivate' | 'delete') {
		if (selected.size === 0) return;
		bulkMutation.mutate(
			{ ids: Array.from(selected), action },
			{
				onSuccess: () => {
					clearSelection();
				}
			}
		);
	}

	// ── Row mutations ──────────────────────────────────────────────────
	const deleteMutation = deleteInventoryItemMutation();
	let confirmDeleteOpen = $state(false);
	let pendingDelete: Item | null = $state(null);

	function askDelete(item: Item) {
		pendingDelete = item;
		confirmDeleteOpen = true;
	}
	function doDelete() {
		if (!pendingDelete) return;
		const id = pendingDelete.id;
		deleteMutation.mutate(id, {
			onSettled: () => {
				confirmDeleteOpen = false;
				pendingDelete = null;
			}
		});
	}

	// ── Modal state ────────────────────────────────────────────────────
	let createOpen = $state(false);
	let editOpen = $state(false);
	let editItem: Item | null = $state(null);
	let adjustOpen = $state(false);
	let adjustItem: Item | null = $state(null);
	let bulkUploadOpen = $state(false);

	function openEdit(item: Item) {
		editItem = item;
		editOpen = true;
	}
	function openAdjust(item: Item) {
		adjustItem = item;
		adjustOpen = true;
	}

	// ── Keyboard nav ───────────────────────────────────────────────────
	let focusIdx = $state(-1);

	function onKeydown(e: KeyboardEvent) {
		// Don't hijack typing into inputs / textareas / contenteditable.
		const target = e.target as HTMLElement | null;
		if (!target) return;
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.tagName === 'SELECT' ||
			target.isContentEditable
		)
			return;
		// Don't hijack keys while a drawer/dialog is open.
		if (createOpen || editOpen || adjustOpen || bulkUploadOpen || confirmDeleteOpen) return;
		if (items.length === 0) return;
		const item = items[focusIdx];
		switch (e.key) {
			case 'j':
				e.preventDefault();
				focusIdx = Math.min(focusIdx + 1, items.length - 1);
				focusRow(focusIdx);
				break;
			case 'k':
				e.preventDefault();
				focusIdx = Math.max(focusIdx - 1, 0);
				focusRow(focusIdx);
				break;
			case 'Enter':
				if (item) {
					e.preventDefault();
					goto(`/inventory/${item.id}`);
				}
				break;
			case 'e':
				if (item) {
					e.preventDefault();
					openEdit(item);
				}
				break;
			case 'a':
				if (item) {
					e.preventDefault();
					openAdjust(item);
				}
				break;
			case 'x':
				if (item) {
					e.preventDefault();
					toggleSelect(item.id);
				}
				break;
		}
	}

	function focusRow(idx: number) {
		const row = document.querySelector<HTMLElement>(`[data-row-idx="${idx}"]`);
		row?.focus();
	}

	// ── Infinite scroll ────────────────────────────────────────────────
	let sentinel: HTMLDivElement | null = $state(null);

	onMount(() => {
		if (!sentinel) return;
		const obs = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
						query.fetchNextPage();
					}
				}
			},
			{ rootMargin: '300px' }
		);
		obs.observe(sentinel);
		return () => obs.disconnect();
	});

	// ── State enum for empty/loading/error/ready ──────────────────────
	const isEmpty = $derived(!query.isPending && !query.isError && items.length === 0);
</script>

<svelte:window onkeydown={onKeydown} />

<div class="stack stack-relaxed pb-20">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Inventory</h1>
			<p class="caption text-fg-muted">SKU catalog, stock levels, and adjustment history.</p>
		</div>
		<div class="cluster cluster-tight">
			<Button variant="tonal" onclick={() => (bulkUploadOpen = true)}>
				<Icon icon={RotateCcw} size="sm" /> Bulk upload
			</Button>
			<Button onclick={() => (createOpen = true)} data-testid="create-item">
				<Icon icon={Plus} size="sm" /> Create item
			</Button>
		</div>
	</header>

	<!-- Saved views -->
	<nav aria-label="Saved views" class="border-border border-b">
		<ul class="cluster gap-0" style="list-style:none;margin:0;padding:0;">
			{#each SAVED_VIEWS as v (v.id)}
				{@const active = view === v.id}
				<li>
					<button
						type="button"
						aria-current={active ? 'page' : undefined}
						onclick={() => setSavedView(v.id)}
						data-testid={`view-${v.id}`}
						class={[
							'label -mb-px inline-block border-b-2 px-4 py-2 transition-colors',
							'focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
							'focus-visible:ring-focus-ring',
							active
								? 'border-primary text-primary'
								: 'text-fg-muted hover:text-fg border-transparent'
						]}
					>
						{v.label}
					</button>
				</li>
			{/each}
		</ul>
	</nav>

	<InventoryFiltersBar
		{q}
		{lowStock}
		{activeFilter}
		{sort}
		{onSearchChange}
		{onLowStockToggle}
		{onActiveFilterChange}
		{onSortChange}
		{onClearAll}
	/>

	{#if query.isError}
		<Alert variant="danger" title="Couldn't load inventory">
			{query.error?.message ?? 'Unknown error'}
		</Alert>
	{:else if isEmpty}
		<EmptyState
			icon={Boxes}
			title={q || lowStock || activeFilter !== 'all' ? 'No matching items' : 'No items yet'}
			description={q || lowStock || activeFilter !== 'all'
				? 'Try a different filter or clear all.'
				: 'Add your first SKU or upload a CSV to get started.'}
		>
			{#snippet action()}
				<div class="cluster cluster-tight">
					<Button onclick={() => (createOpen = true)}>
						<Icon icon={Plus} size="sm" /> Create item
					</Button>
					<Button variant="tonal" onclick={() => (bulkUploadOpen = true)}>
						<Icon icon={RotateCcw} size="sm" /> Bulk upload
					</Button>
				</div>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-left" data-testid="inventory-table">
				<thead>
					<tr class="border-border border-b">
						<th class="w-12 px-3 py-3">
							<input
								type="checkbox"
								aria-label="Select all"
								checked={allSelected}
								onchange={toggleSelectAll}
								data-testid="select-all"
							/>
						</th>
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							SKU
						</th>
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Name
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase md:table-cell"
						>
							Category
						</th>
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Stock
						</th>
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Level
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
						>
							Price
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
						>
							Status
						</th>
						<th class="w-12"></th>
					</tr>
				</thead>
				<tbody>
					{#if query.isPending}
						{#each [0, 1, 2, 3, 4] as i (i)}
							<tr class="border-border border-b">
								<td class="px-3 py-3"><Skeleton class="h-4 w-4" /></td>
								<td class="px-3 py-3"><Skeleton class="h-4 w-24" /></td>
								<td class="px-3 py-3"><Skeleton class="h-4 w-48" /></td>
								<td class="hidden px-3 py-3 md:table-cell"><Skeleton class="h-4 w-20" /></td>
								<td class="px-3 py-3"><Skeleton class="h-4 w-12" /></td>
								<td class="px-3 py-3"><Skeleton class="h-5 w-16 rounded-full" /></td>
								<td class="hidden px-3 py-3 lg:table-cell"><Skeleton class="h-4 w-16" /></td>
								<td class="hidden px-3 py-3 lg:table-cell"
									><Skeleton class="h-5 w-16 rounded-full" /></td
								>
								<td></td>
							</tr>
						{/each}
					{:else}
						{#each items as item, idx (item.id)}
							{@const isSelected = selected.has(item.id)}
							{@const active = activeBadge(item)}
							<tr
								class={[
									'border-border hover:bg-bg-muted border-b transition-colors outline-none',
									'focus-visible:ring-focus-ring focus-visible:ring-2',
									isSelected && 'bg-primary-soft'
								]}
								tabindex="0"
								data-row-idx={idx}
								data-testid="inventory-row"
								onclick={() => goto(`/inventory/${item.id}`)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										goto(`/inventory/${item.id}`);
									}
								}}
							>
								<td class="px-3 py-3" onclick={(e) => e.stopPropagation()} role="cell">
									<input
										type="checkbox"
										aria-label={`Select ${item.sku}`}
										checked={isSelected}
										onchange={() => toggleSelect(item.id)}
										data-testid={`row-checkbox-${item.id}`}
									/>
								</td>
								<td class="px-3 py-3">
									<code class="caption text-fg">{item.sku}</code>
								</td>
								<td class="px-3 py-3">
									<div class="stack stack-tight">
										<span class="body-base text-fg truncate font-medium">{item.name}</span>
										{#if item.supplier_name}
											<span class="caption text-fg-muted truncate">{item.supplier_name}</span>
										{/if}
									</div>
								</td>
								<td class="hidden px-3 py-3 md:table-cell">
									<span class="caption text-fg-muted">{item.category ?? '—'}</span>
								</td>
								<td class="px-3 py-3" onclick={(e) => e.stopPropagation()} role="cell">
									<!-- Click stock cell to open the adjust-stock dialog (Notion / Airtable pattern). -->
									<button
										type="button"
										class="focus-visible:ring-focus-ring hover:bg-bg-elevated rounded-md px-1.5 py-0.5 focus-visible:ring-2 focus-visible:outline-none"
										onclick={() => openAdjust(item)}
										data-testid={`stock-cell-${item.id}`}
										aria-label={`Adjust stock for ${item.sku}, currently ${item.current_stock}`}
									>
										<span class="body-base text-fg tabular-nums">{item.current_stock}</span>
										<span class="caption text-fg-subtle"> {item.unit_of_measure}</span>
									</button>
								</td>
								<td class="px-3 py-3">
									<StockLevelBadge {item} />
								</td>
								<td class="hidden px-3 py-3 lg:table-cell">
									<span class="body-base text-fg"
										>{formatPrice(item.unit_price, item.currency)}</span
									>
								</td>
								<td class="hidden px-3 py-3 lg:table-cell">
									<Badge variant={active.variant} style="soft" size="sm">{active.label}</Badge>
								</td>
								<td
									class="w-12 px-3 py-3 text-right"
									onclick={(e) => e.stopPropagation()}
									role="cell"
								>
									<Dropdown.Root>
										<Dropdown.Trigger>
											<Button variant="ghost" size="sm" aria-label={`Actions for ${item.sku}`}>
												<Icon icon={MoreVertical} size="sm" />
											</Button>
										</Dropdown.Trigger>
										<Dropdown.Menu>
											<Dropdown.Item onclick={() => openAdjust(item)}>
												<Icon icon={RotateCcw} size="sm" /> Adjust stock
											</Dropdown.Item>
											<Dropdown.Item onclick={() => openEdit(item)}>
												<Icon icon={Edit} size="sm" /> Edit
											</Dropdown.Item>
											<Dropdown.Separator />
											{#if item.is_active}
												<Dropdown.Item
													onclick={() =>
														bulkMutation.mutate({ ids: [item.id], action: 'deactivate' })}
												>
													<Icon icon={Pause} size="sm" /> Deactivate
												</Dropdown.Item>
											{:else}
												<Dropdown.Item
													onclick={() =>
														bulkMutation.mutate({ ids: [item.id], action: 'activate' })}
												>
													<Icon icon={Check} size="sm" /> Activate
												</Dropdown.Item>
											{/if}
											<Dropdown.Item variant="danger" onclick={() => askDelete(item)}>
												<Icon icon={Trash2} size="sm" /> Delete
											</Dropdown.Item>
										</Dropdown.Menu>
									</Dropdown.Root>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Infinite-scroll sentinel -->
		<div bind:this={sentinel} aria-hidden="true" class="h-px"></div>

		{#if query.isFetchingNextPage}
			<div class="flex justify-center py-3">
				<span class="caption text-fg-muted">Loading more…</span>
			</div>
		{/if}
	{/if}
</div>

<BulkActionsBar
	count={selected.size}
	onActivate={() => doBulk('activate')}
	onDeactivate={() => doBulk('deactivate')}
	onDelete={() => doBulk('delete')}
	onClear={clearSelection}
	disabled={bulkMutation.isPending}
/>

<CreateItemDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<EditItemDrawer bind:open={editOpen} item={editItem} onOpenChange={(o) => (editOpen = o)} />
<AdjustStockDialog
	bind:open={adjustOpen}
	item={adjustItem}
	onOpenChange={(o) => (adjustOpen = o)}
/>
<BulkUploadDrawer bind:open={bulkUploadOpen} onOpenChange={(o) => (bulkUploadOpen = o)} />

{#if pendingDelete}
	{@const pd = pendingDelete}
	<ConfirmDialog
		bind:open={confirmDeleteOpen}
		title="Delete this item?"
		description={`${pd.sku} — ${pd.name}. This soft-deletes (deactivates) the item; stock history is preserved.`}
		confirmLabel="Delete"
		variant="danger"
		loading={deleteMutation.isPending}
		onConfirm={doDelete}
	/>
{/if}
