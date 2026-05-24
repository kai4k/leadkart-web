<script lang="ts">
	import { goto } from '$app/navigation';
	import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '$ui';
	import { ResourceListPage, type ResourceListAction, type BulkAction } from '$lib/components/data';
	import { Icon, Plus, Package, UploadCloud, Pause, Check, Trash2 } from '$icons';
	import {
		UseBulkSelection,
		UseKeyboardListNav,
		UseSavedViews,
		UseUrlFilters,
		type SavedView
	} from '$lib/hooks';
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
	import { AuthError, NetworkError } from '$api/errors';
	import { buildProductFilterConfig, type ProductFilters } from './ProductFilters.svelte';
	import CreateProductDrawer from './CreateProductDrawer.svelte';
	import ProductBulkUploadDrawer from './ProductBulkUploadDrawer.svelte';

	/**
	 * ProductsList — pharma product catalog.
	 *
	 * Composes ResourceListPage: title row + saved-view tabs + filter
	 * bar + bulk-action bar + body. URL is the single source of truth
	 * for filters (via UseUrlFilters). Body uses `<DataTable.Root>`
	 * with a `'select'` column wired to the shared `UseBulkSelection`.
	 *
	 * Linear-style keyboard nav (j/k row focus, Enter detail, x toggle
	 * selection) is provided via `UseKeyboardListNav` and the focused
	 * row gets a primary border-l accent.
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

	// ── Keyboard nav (Linear / Superhuman convention) ─────────────────
	// Roving-tabindex pattern: DataTable wires onkeydown/focusin/focusout
	// from the <tbody> to the nav store and registers per-row refs so
	// `j`/`k` move DOM focus. When a drawer (Create / Bulk upload) is
	// open it owns focus, so keys naturally bubble through the portal
	// boundary without polluting the row list.
	const nav = new UseKeyboardListNav<ProductDto>({
		onSelect: (p) => openDetail(p),
		onToggleSelect: (p) => selection.toggle(p.id)
	});

	$effect(() => {
		nav.setItems(products);
	});

	// ── DataTable column config ───────────────────────────────────────
	const columns: DataTableColumn<ProductDto>[] = [
		{
			id: 'select',
			header: '',
			class: 'w-10',
			selectLabel: (p) => `Select ${p.brand_name}`
		},
		{ id: 'brand', header: 'Brand', accessor: 'brand_name', cell: brandCell },
		{
			id: 'category',
			header: 'Category',
			accessor: 'product_category',
			hideBelow: 'md'
		},
		{
			id: 'schedule',
			header: 'Schedule',
			accessor: (p) => p.drug_schedule,
			cell: scheduleCell,
			hideBelow: 'md'
		},
		{
			id: 'stock',
			header: 'Stock',
			accessor: (p) => p.total_quantity_available,
			cell: stockCell
		},
		{
			id: 'expiry',
			header: 'Expiry',
			accessor: (p) => p.earliest_expiry_at ?? '—',
			cell: expiryCell,
			hideBelow: 'lg'
		},
		{
			id: 'mrp',
			header: 'MRP',
			accessor: (p) => p.mrp,
			cell: mrpCell,
			class: 'tabular-nums',
			hideBelow: 'lg'
		},
		{
			id: 'status',
			header: 'Status',
			accessor: (p) => activeBadge(p).label,
			cell: statusCell,
			hideBelow: 'lg'
		}
	];

	const tableState = $derived(
		query.isError ? 'error' : query.isPending ? 'loading' : isEmpty ? 'empty' : 'ready'
	);

	const errorCopy = $derived.by(() => {
		const err = query.error;
		if (!err) return '';
		if (err instanceof NetworkError) return 'Check your network connection and try again.';
		if (err instanceof AuthError)
			return err.status === 403
				? "You don't have permission to view products."
				: 'Your session expired. Sign in again.';
		return 'Something went wrong. Please try again.';
	});
</script>

{#snippet brandCell(product: ProductDto)}
	<div class="stack stack-tight">
		<span class="body-base text-fg truncate font-medium">{product.brand_name}</span>
		{#if product.generic_name}
			<span class="caption text-fg-muted truncate">{product.generic_name}</span>
		{/if}
	</div>
{/snippet}

{#snippet scheduleCell(product: ProductDto)}
	{@const sched = drugScheduleBadge(product.drug_schedule)}
	<Badge variant={sched.variant} appearance="soft" size="sm">{sched.label}</Badge>
{/snippet}

{#snippet stockCell(product: ProductDto)}
	{@const stock = stockLevelBadge(product)}
	<div class="cluster cluster-tight">
		<Badge variant={stock.variant} appearance="soft" size="sm">{stock.label}</Badge>
		<span class="caption text-fg-muted tabular-nums">{product.total_quantity_available}</span>
	</div>
{/snippet}

{#snippet expiryCell(product: ProductDto)}
	{@const expiry = expiryStatus(product.earliest_expiry_at)}
	{#if expiry}
		<Badge variant={expiry.variant} appearance="soft" size="sm">{expiry.label}</Badge>
	{:else}
		<span class="caption text-fg-subtle">—</span>
	{/if}
{/snippet}

{#snippet mrpCell(product: ProductDto)}
	<span class="body-base text-fg">{formatPrice(product.mrp)}</span>
{/snippet}

{#snippet statusCell(product: ProductDto)}
	{@const active = activeBadge(product)}
	<Badge variant={active.variant} appearance="soft" size="sm">{active.label}</Badge>
{/snippet}

{#snippet emptyStateSlot()}
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
{/snippet}

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
			Couldn't load products. {errorCopy}
		</div>
	{:else}
		<div data-testid="products-table">
			<DataTable.Root
				{columns}
				rows={products}
				rowKey={(p: ProductDto) => p.id}
				state={tableState}
				error={null}
				onRowClick={openDetail}
				{selection}
				{nav}
				emptyState={emptyStateSlot}
			/>
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
