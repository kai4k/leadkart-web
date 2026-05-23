<script lang="ts">
	import { goto } from '$app/navigation';
	import { Badge, Button, EmptyState, Skeleton } from '$ui';
	import { ResourceListPage, type ResourceListAction, type BulkAction } from '$lib/components/data';
	import { Icon, Plus, Package, UploadCloud, Pause, Check, Trash2 } from '$icons';
	import { UseBulkSelection, UseSavedViews, UseUrlFilters, type SavedView } from '$lib/hooks';
	import {
		productsInfiniteQuery,
		bulkProductActionMutation,
		categoriesQuery,
		typesQuery
	} from '$features/inventory/queries';
	import {
		activeBadge,
		drugScheduleBadge,
		expiryStatus,
		formatPrice,
		stockLevelBadge
	} from '$features/inventory/view-models';
	import type { ProductDto, DrugSchedule } from '$features/inventory/schemas';
	import { drugScheduleSchema } from '$features/inventory/schemas';
	import type { ListProductsParams, ProductSort } from '$features/inventory/api';
	import { buildProductFilterConfig, type ProductFilters } from './ProductFilters.svelte';
	import CreateProductDrawer from './CreateProductDrawer.svelte';
	import ProductBulkUploadDrawer from './ProductBulkUploadDrawer.svelte';

	/**
	 * ProductsList — pharma product catalog.
	 *
	 * Composes ResourceListPage: title row + saved-view tabs + filter
	 * bar + bulk-action bar + body. URL is the single source of truth
	 * for filters (via UseUrlFilters). Body is a custom table since
	 * pharma rows have a wide column set (brand, generic, category,
	 * schedule pill, stock pill, expiry pill, price, status).
	 */

	const filters = new UseUrlFilters<ProductFilters>({
		q: { type: 'string', label: 'Search' },
		product_category: { type: 'string[]', label: 'Category' },
		product_type: { type: 'string[]', label: 'Type' },
		drug_schedule: { type: 'string[]', label: 'Schedule' },
		is_active: { type: 'string', label: 'Status' },
		low_stock: { type: 'string', label: 'Low stock' },
		expiring_within_days: { type: 'string', label: 'Expiring within' }
	});

	const savedViews = new UseSavedViews<ProductFilters>(
		[
			{ id: 'all', label: 'All', filters: {} },
			{ id: 'low', label: 'Low stock', filters: { low_stock: 'true' } },
			{
				id: 'expiring',
				label: 'Expiring soon',
				filters: { expiring_within_days: '90' }
			},
			{ id: 'inactive', label: 'Inactive', filters: { is_active: 'false' } },
			{
				id: 'schedule_h',
				label: 'Schedule H',
				filters: { drug_schedule: ['schedule_h', 'schedule_h1'] }
			}
		] satisfies SavedView<ProductFilters>[],
		filters
	);

	// ── Reference data (categories + types for filter dropdowns) ──────
	const categoriesQ = categoriesQuery();
	const typesQ = typesQuery();
	const filterFields = $derived(
		buildProductFilterConfig(categoriesQ.data?.items ?? [], typesQ.data?.items ?? [])
	);

	// ── Map URL filters → API params ─────────────────────────────────
	function isDrugSchedule(v: string): v is DrugSchedule {
		return (drugScheduleSchema.options as readonly string[]).includes(v);
	}
	const listParams: ListProductsParams = $derived.by(() => {
		const f = filters.filters;
		const sched = (f.drug_schedule ?? []).filter(isDrugSchedule);
		const exp = f.expiring_within_days ? Number(f.expiring_within_days) : undefined;
		return {
			q: typeof f.q === 'string' ? f.q : undefined,
			product_category: (f.product_category ?? []).length
				? (f.product_category as string[])
				: undefined,
			product_type: (f.product_type ?? []).length ? (f.product_type as string[]) : undefined,
			drug_schedule: sched.length ? sched : undefined,
			is_active: f.is_active === 'true' ? true : f.is_active === 'false' ? false : undefined,
			low_stock: f.low_stock === 'true' ? true : undefined,
			expiring_within_days: Number.isFinite(exp) ? exp : undefined,
			sort: 'brand_name:asc' as ProductSort
		};
	});

	const query = $derived(productsInfiniteQuery(listParams));
	const products = $derived.by(() => {
		const pages = query.data?.pages ?? [];
		return pages.flatMap((p) => p.items);
	});

	// ── Bulk selection ────────────────────────────────────────────────
	const selection = new UseBulkSelection<ProductDto>();
	const allVisibleSelected = $derived(selection.areAllVisibleSelected(products));

	const bulkMut = bulkProductActionMutation();

	const bulkActions: BulkAction[] = [
		{
			id: 'activate',
			label: 'Activate',
			icon: Check as never,
			onClick: () =>
				bulkMut.mutate(
					{ ids: Array.from(selection.selected), action: 'activate' },
					{ onSuccess: () => selection.clear() }
				)
		},
		{
			id: 'deactivate',
			label: 'Deactivate',
			icon: Pause as never,
			onClick: () =>
				bulkMut.mutate(
					{ ids: Array.from(selection.selected), action: 'deactivate' },
					{ onSuccess: () => selection.clear() }
				)
		},
		{
			id: 'delete',
			label: 'Delete',
			icon: Trash2 as never,
			variant: 'danger',
			confirm: {
				title: 'Delete selected products?',
				description: 'This soft-deletes (deactivates) the products. Stock + history is preserved.',
				confirmLabel: 'Delete'
			},
			onClick: () =>
				bulkMut.mutate(
					{ ids: Array.from(selection.selected), action: 'delete' },
					{ onSuccess: () => selection.clear() }
				)
		}
	];

	// ── Drawer state ──────────────────────────────────────────────────
	let createOpen = $state(false);
	let bulkUploadOpen = $state(false);

	const primaryAction: ResourceListAction = {
		label: 'Create product',
		icon: Plus as never,
		onClick: () => (createOpen = true)
	};
	const secondaryActions: ResourceListAction[] = [
		{
			label: 'Bulk upload',
			icon: UploadCloud as never,
			onClick: () => (bulkUploadOpen = true)
		}
	];

	const isEmpty = $derived(!query.isPending && !query.isError && products.length === 0);

	function openDetail(p: ProductDto) {
		goto(`/inventory/${p.id}`);
	}

	function toggleSelectAll() {
		if (allVisibleSelected) selection.deselectAllVisible(products);
		else selection.selectAllVisible(products);
	}
</script>

<ResourceListPage
	title="Inventory"
	subtitle="Pharma catalog: products, batches, stock movements."
	{primaryAction}
	{secondaryActions}
	{savedViews}
	filters={{ config: filterFields, instance: filters }}
	bulk={{ selection, actions: bulkActions }}
>
	{#if query.isError}
		<div
			class="border-danger-500 text-danger-700 rounded-md border p-4"
			data-testid="products-error"
		>
			Couldn't load products. {query.error?.message ?? ''}
		</div>
	{:else if isEmpty}
		<EmptyState
			icon={Package}
			title={filters.hasActive ? 'No matching products' : 'No products yet'}
			description={filters.hasActive
				? 'Try a different filter or clear all.'
				: 'Add your first pharma product, or bulk upload a CSV.'}
		>
			{#snippet action()}
				<div class="cluster cluster-tight">
					<Button onclick={() => (createOpen = true)} data-testid="empty-create-product">
						<Icon icon={Plus} size="sm" /> Create product
					</Button>
					<Button variant="tonal" onclick={() => (bulkUploadOpen = true)}>
						<Icon icon={UploadCloud} size="sm" /> Bulk upload
					</Button>
				</div>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-left" data-testid="products-table">
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
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Brand
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase md:table-cell"
						>
							Category
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase md:table-cell"
						>
							Schedule
						</th>
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Stock
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
						>
							Expiry
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
						>
							MRP
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
						>
							Status
						</th>
					</tr>
				</thead>
				<tbody>
					{#if query.isPending}
						{#each [0, 1, 2, 3, 4] as i (i)}
							<tr class="border-border border-b">
								<td class="px-3 py-3"><Skeleton class="h-4 w-4" /></td>
								<td class="px-3 py-3"><Skeleton class="h-4 w-40" /></td>
								<td class="hidden px-3 py-3 md:table-cell"><Skeleton class="h-4 w-20" /></td>
								<td class="hidden px-3 py-3 md:table-cell"
									><Skeleton class="h-5 w-16 rounded-full" /></td
								>
								<td class="px-3 py-3"><Skeleton class="h-5 w-16 rounded-full" /></td>
								<td class="hidden px-3 py-3 lg:table-cell"><Skeleton class="h-4 w-16" /></td>
								<td class="hidden px-3 py-3 lg:table-cell"><Skeleton class="h-4 w-12" /></td>
								<td class="hidden px-3 py-3 lg:table-cell"
									><Skeleton class="h-5 w-16 rounded-full" /></td
								>
							</tr>
						{/each}
					{:else}
						{#each products as product (product.id)}
							{@const stock = stockLevelBadge(product)}
							{@const sched = drugScheduleBadge(product.drug_schedule)}
							{@const expiry = expiryStatus(product.earliest_expiry_at)}
							{@const active = activeBadge(product)}
							{@const isSel = selection.isSelected(product.id)}
							<tr
								class={[
									'border-border hover:bg-bg-muted cursor-pointer border-b transition-colors',
									'focus-visible:ring-focus-ring outline-none focus-visible:ring-2',
									isSel && 'bg-primary-soft/30'
								]}
								tabindex="0"
								data-testid="product-row"
								data-product-id={product.id}
								onclick={() => openDetail(product)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										openDetail(product);
									}
								}}
							>
								<td class="px-3 py-3" onclick={(e) => e.stopPropagation()} role="cell">
									<input
										type="checkbox"
										aria-label={`Select ${product.brand_name}`}
										checked={isSel}
										onchange={() => selection.toggle(product.id)}
										data-testid={`row-checkbox-${product.id}`}
									/>
								</td>
								<td class="px-3 py-3">
									<div class="stack stack-tight">
										<span class="body-base text-fg truncate font-medium">{product.brand_name}</span>
										{#if product.generic_name}
											<span class="caption text-fg-muted truncate">{product.generic_name}</span>
										{/if}
									</div>
								</td>
								<td class="hidden px-3 py-3 md:table-cell">
									<span class="caption text-fg-muted">{product.product_category}</span>
								</td>
								<td class="hidden px-3 py-3 md:table-cell">
									<Badge variant={sched.variant} style="soft" size="sm">{sched.label}</Badge>
								</td>
								<td class="px-3 py-3">
									<div class="cluster cluster-tight">
										<Badge variant={stock.variant} style="soft" size="sm">{stock.label}</Badge>
										<span class="caption text-fg-muted tabular-nums"
											>{product.total_quantity_available}</span
										>
									</div>
								</td>
								<td class="hidden px-3 py-3 lg:table-cell">
									{#if expiry}
										<Badge variant={expiry.variant} style="soft" size="sm">{expiry.label}</Badge>
									{:else}
										<span class="caption text-fg-subtle">—</span>
									{/if}
								</td>
								<td class="hidden px-3 py-3 tabular-nums lg:table-cell">
									<span class="body-base text-fg">{formatPrice(product.mrp)}</span>
								</td>
								<td class="hidden px-3 py-3 lg:table-cell">
									<Badge variant={active.variant} style="soft" size="sm">{active.label}</Badge>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		{#if query.isFetchingNextPage}
			<div class="flex justify-center py-3">
				<span class="caption text-fg-muted">Loading more…</span>
			</div>
		{/if}
	{/if}
</ResourceListPage>

<CreateProductDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<ProductBulkUploadDrawer bind:open={bulkUploadOpen} onOpenChange={(o) => (bulkUploadOpen = o)} />
