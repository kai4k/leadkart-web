<script lang="ts">
	import { Badge, Button } from '$ui';
	import { Icon, Search, X, AlertCircle, Boxes } from '$icons';

	/**
	 * Filter toolbar for the inventory list.
	 *
	 * Surfaces:
	 *   - Search box (q)
	 *   - Low-stock quick toggle (Shopify pattern — one-click pill)
	 *   - is_active toggle (Active / Inactive / All)
	 *   - Sort dropdown
	 *   - Chip row of applied filters with `×` to remove
	 *   - "Clear all" link when any filter is set
	 *
	 * URL-state is owned by the parent (InventoryList) — this component
	 * is dumb + only emits change events.
	 */

	type Props = {
		q: string;
		lowStock: boolean;
		activeFilter: 'all' | 'active' | 'inactive';
		sort: string;
		onSearchChange: (q: string) => void;
		onLowStockToggle: () => void;
		onActiveFilterChange: (v: 'all' | 'active' | 'inactive') => void;
		onSortChange: (v: string) => void;
		onClearAll: () => void;
	};

	let {
		q,
		lowStock,
		activeFilter,
		sort,
		onSearchChange,
		onLowStockToggle,
		onActiveFilterChange,
		onSortChange,
		onClearAll
	}: Props = $props();

	const SORT_OPTIONS = [
		{ value: 'name:asc', label: 'Name (A → Z)' },
		{ value: 'name:desc', label: 'Name (Z → A)' },
		{ value: 'current_stock:asc', label: 'Stock (low → high)' },
		{ value: 'current_stock:desc', label: 'Stock (high → low)' },
		{ value: 'unit_price:asc', label: 'Price (low → high)' },
		{ value: 'unit_price:desc', label: 'Price (high → low)' },
		{ value: 'created_at:desc', label: 'Recently added' }
	];

	const hasFilters = $derived(!!q || lowStock || activeFilter !== 'all');
</script>

<div class="stack stack-tight" data-testid="inventory-filters">
	<div class="cluster cluster-tight flex-wrap">
		<label class="relative">
			<span class="sr-only">Search items</span>
			<span
				class="text-fg-subtle pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
				aria-hidden="true"
			>
				<Icon icon={Search} size="sm" />
			</span>
			<input
				type="search"
				name="q"
				placeholder="Search SKU, name or barcode…"
				value={q}
				oninput={(e) => onSearchChange((e.currentTarget as HTMLInputElement).value)}
				class="glass-input w-72 rounded-md py-2 pr-3 pl-10 text-sm"
			/>
		</label>

		<button
			type="button"
			aria-pressed={lowStock}
			onclick={onLowStockToggle}
			data-testid="filter-low-stock"
			class={[
				'label-small focus-visible:ring-focus-ring inline-flex items-center gap-1 rounded-full border px-3 py-1.5 transition-colors',
				'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
				lowStock
					? 'border-warning-500 bg-warning-50 text-warning-900'
					: 'border-border text-fg-muted hover:bg-bg-muted'
			]}
		>
			<Icon icon={AlertCircle} size="xs" /> Low stock
		</button>

		<label class="cluster cluster-tight">
			<span class="caption text-fg-muted">Status</span>
			<select
				value={activeFilter}
				onchange={(e) =>
					onActiveFilterChange(
						(e.currentTarget as HTMLSelectElement).value as 'all' | 'active' | 'inactive'
					)}
				class="glass-input rounded-md px-3 py-1.5 text-sm"
				data-testid="filter-status"
			>
				<option value="all">All</option>
				<option value="active">Active</option>
				<option value="inactive">Inactive</option>
			</select>
		</label>

		<label class="cluster cluster-tight">
			<span class="caption text-fg-muted">Sort</span>
			<select
				value={sort}
				onchange={(e) => onSortChange((e.currentTarget as HTMLSelectElement).value)}
				class="glass-input rounded-md px-3 py-1.5 text-sm"
				data-testid="filter-sort"
			>
				{#each SORT_OPTIONS as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if hasFilters}
		<div class="cluster cluster-tight">
			{#if q}
				<Badge variant="info" style="soft" size="sm">
					<span class="cluster cluster-tight">
						<Icon icon={Search} size="xs" />
						{q}
						<button
							type="button"
							class="hover:text-fg ml-1"
							aria-label="Clear search"
							onclick={() => onSearchChange('')}
						>
							<Icon icon={X} size="xs" />
						</button>
					</span>
				</Badge>
			{/if}
			{#if lowStock}
				<Badge variant="warning" style="soft" size="sm">
					<span class="cluster cluster-tight">
						Low stock
						<button
							type="button"
							class="hover:text-fg ml-1"
							aria-label="Clear low-stock filter"
							onclick={onLowStockToggle}
						>
							<Icon icon={X} size="xs" />
						</button>
					</span>
				</Badge>
			{/if}
			{#if activeFilter !== 'all'}
				<Badge variant="neutral" style="soft" size="sm">
					<span class="cluster cluster-tight">
						<Icon icon={Boxes} size="xs" />
						{activeFilter === 'active' ? 'Active' : 'Inactive'}
						<button
							type="button"
							class="hover:text-fg ml-1"
							aria-label="Clear status filter"
							onclick={() => onActiveFilterChange('all')}
						>
							<Icon icon={X} size="xs" />
						</button>
					</span>
				</Badge>
			{/if}
			<Button variant="link" size="sm" onclick={onClearAll}>Clear all</Button>
		</div>
	{/if}
</div>
