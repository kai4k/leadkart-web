<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Alert, Skeleton, Tabs, ConfirmDialog } from '#lib/components/ui/index.ts';
	import { useUrlTab } from '#lib/hooks/index.ts';
	import { productDetailQuery, deleteProductMutation } from '#lib/features/inventory/queries.ts';
	import { computePriceWithGst, formatPrice } from '#lib/features/inventory/view-models.ts';
	import { getListErrorMessage } from '#lib/api/error-messages.ts';
	import ProductDetailHeader from './ProductDetailHeader.svelte';
	import ProductIdentityCard from './ProductIdentityCard.svelte';
	import ProductCommercialCard from './ProductCommercialCard.svelte';
	import ProductRegulatoryCard from './ProductRegulatoryCard.svelte';
	import BatchesList from './BatchesList.svelte';
	import StockMovementsTimeline from './StockMovementsTimeline.svelte';
	import EditProductDrawer from './EditProductDrawer.svelte';

	/**
	 * ProductDetail — composes the header, summary cards, and tabs of
	 * Batches / Movements / Pricing / Activity.
	 */
	type Props = { id: string };
	let { id }: Props = $props();

	const query = $derived(productDetailQuery(id));
	const product = $derived(query.data ?? null);

	// URL-synced tab — `?tab=movements` deep-links into the stock-
	// movement timeline; back-button restores the prior view.
	const tab = useUrlTab('batches', ['batches', 'movements', 'pricing', 'activity']);
	let editOpen = $state(false);
	let confirmDeleteOpen = $state(false);

	const deleteMut = deleteProductMutation();

	function onEdit() {
		editOpen = true;
	}
	function onDelete() {
		confirmDeleteOpen = true;
	}
	function doDelete() {
		if (!product) return;
		deleteMut.mutate(product.id, {
			onSettled: () => {
				confirmDeleteOpen = false;
				goto(resolve('inventory'));
			}
		});
	}

	const purchaseWithGst = $derived(
		product ? computePriceWithGst(product.purchase_rate, product.gst_percentage) : 0
	);

	const saleWithGst = $derived(
		product ? computePriceWithGst(product.sale_rate, product.gst_percentage) : 0
	);

	const errorCopy = $derived.by(() => {
		const err = query.error;
		if (!err) return 'Unknown error';
		return getListErrorMessage(err, 'this product', 'This product was deleted or moved.') ?? '';
	});
</script>

{#if query.isPending}
	<div class="stack stack-relaxed">
		<Skeleton class="h-8 w-1/3" />
		<div class="grid gap-3 md:grid-cols-3">
			<Skeleton class="h-40 w-full" />
			<Skeleton class="h-40 w-full" />
			<Skeleton class="h-40 w-full" />
		</div>
	</div>
{:else if query.isError}
	<Alert variant="destructive" title="Couldn't load product">
		{errorCopy}
	</Alert>
{:else if product}
	<div class="stack stack-relaxed">
		<ProductDetailHeader {product} {onEdit} {onDelete} />

		<div class="grid gap-3 md:grid-cols-3">
			<ProductIdentityCard {product} />
			<ProductCommercialCard {product} />
			<ProductRegulatoryCard {product} />
		</div>

		<Tabs.Root value={tab.value} onValueChange={tab.set}>
			<Tabs.List>
				<Tabs.Trigger value="batches">Batches</Tabs.Trigger>
				<Tabs.Trigger value="movements">Stock movements</Tabs.Trigger>
				<Tabs.Trigger value="pricing">Pricing</Tabs.Trigger>
				<Tabs.Trigger value="activity">Activity</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="batches"><BatchesList productId={product.id} /></Tabs.Content>
			<Tabs.Content value="movements"
				><StockMovementsTimeline productId={product.id} /></Tabs.Content
			>

			<Tabs.Content value="pricing">
				<div class="stack stack-tight">
					<h2 class="h5">Pricing breakdown</h2>
					<dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<div class="stack stack-tight">
							<dt class="caption text-muted-foreground">MRP</dt>
							<dd class="body-base text-foreground tabular-nums">{formatPrice(product.mrp)}</dd>
						</div>
						<div class="stack stack-tight">
							<dt class="caption text-muted-foreground">Purchase rate</dt>
							<dd class="body-base text-foreground tabular-nums">
								{formatPrice(product.purchase_rate)}
							</dd>
						</div>
						<div class="stack stack-tight">
							<dt class="caption text-muted-foreground">Sale rate</dt>
							<dd class="body-base text-foreground tabular-nums">
								{formatPrice(product.sale_rate)}
							</dd>
						</div>
						<div class="stack stack-tight">
							<dt class="caption text-muted-foreground">GST</dt>
							<dd class="body-base text-foreground tabular-nums">{product.gst_percentage}%</dd>
						</div>
						<div class="stack stack-tight">
							<dt class="caption text-muted-foreground">Purchase rate (incl. GST)</dt>
							<dd class="body-base text-foreground tabular-nums" data-testid="purchase-with-gst">
								{formatPrice(purchaseWithGst)}
							</dd>
						</div>
						<div class="stack stack-tight">
							<dt class="caption text-muted-foreground">Sale rate (incl. GST)</dt>
							<dd class="body-base text-foreground tabular-nums" data-testid="sale-with-gst">
								{formatPrice(saleWithGst)}
							</dd>
						</div>
					</dl>
				</div>
			</Tabs.Content>

			<Tabs.Content value="activity">
				<p class="caption text-muted-foreground">
					Audit log of edits and bulk actions — coming in a follow-up.
				</p>
			</Tabs.Content>
		</Tabs.Root>
	</div>

	<EditProductDrawer bind:open={editOpen} {product} onOpenChange={(o) => (editOpen = o)} />

	<ConfirmDialog
		bind:open={confirmDeleteOpen}
		title="Delete this product?"
		description={`${product.brand_name} will be deactivated. Batches + stock movements remain.`}
		confirmLabel="Delete"
		variant="danger"
		loading={deleteMut.isPending}
		onConfirm={doDelete}
	/>
{/if}
