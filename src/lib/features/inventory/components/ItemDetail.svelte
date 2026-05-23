<script lang="ts">
	import { Alert, Badge, Button, Card, ConfirmDialog, CopyButton, Skeleton, Dropdown } from '$ui';
	import { Icon, ChevronLeft, Edit, Trash2, MoreVertical, Pause, Check, RotateCcw } from '$icons';
	import {
		inventoryItemQuery,
		bulkInventoryActionMutation,
		deleteInventoryItemMutation
	} from '$features/inventory/queries';
	import { activeBadge, formatPrice } from '$features/inventory/view-models';
	import StockLevelBadge from './StockLevelBadge.svelte';
	import StockHistoryList from './StockHistoryList.svelte';
	import EditItemDrawer from './EditItemDrawer.svelte';
	import AdjustStockDialog from './AdjustStockDialog.svelte';
	import { goto } from '$app/navigation';

	type Props = { id: string };
	let { id }: Props = $props();

	const query = $derived(inventoryItemQuery(id));
	const item = $derived(query.data ?? null);

	const bulkMutation = bulkInventoryActionMutation();
	const deleteMutation = deleteInventoryItemMutation();

	let editOpen = $state(false);
	let adjustOpen = $state(false);
	let confirmDeleteOpen = $state(false);

	function toggleActive() {
		if (!item) return;
		bulkMutation.mutate({
			ids: [item.id],
			action: item.is_active ? 'deactivate' : 'activate'
		});
	}

	function doDelete() {
		if (!item) return;
		deleteMutation.mutate(item.id, {
			onSuccess: () => {
				confirmDeleteOpen = false;
				goto('/inventory');
			}
		});
	}
</script>

<div class="stack stack-relaxed">
	<a
		href="/inventory"
		class="cluster cluster-tight text-fg-muted hover:text-fg caption inline-flex"
	>
		<Icon icon={ChevronLeft} size="xs" /> Back to inventory
	</a>

	{#if query.isPending}
		<div class="stack stack-relaxed" aria-busy="true">
			<Skeleton class="h-7 w-1/2" />
			<Skeleton class="h-32 w-full rounded-md" />
		</div>
	{:else if query.isError || !item}
		<Alert variant="warning" title="Item not found">
			This item doesn't exist or you don't have access.
		</Alert>
	{:else}
		{@const active = activeBadge(item)}
		<header class="cluster cluster-spread">
			<div class="stack stack-tight">
				<div class="cluster cluster-tight">
					<h1 class="h1">{item.name}</h1>
					<StockLevelBadge {item} size="md" />
					<Badge variant={active.variant} style="soft" size="md">{active.label}</Badge>
				</div>
				<div class="cluster cluster-tight">
					<code class="caption text-fg-subtle">{item.sku}</code>
					<CopyButton value={item.sku} label="Copy SKU" />
				</div>
			</div>
			<div class="cluster cluster-tight">
				<Button onclick={() => (adjustOpen = true)} data-testid="detail-adjust-stock">
					<Icon icon={RotateCcw} size="sm" /> Adjust stock
				</Button>
				<Dropdown.Root>
					<Dropdown.Trigger>
						<Button variant="ghost" aria-label="More actions">
							<Icon icon={MoreVertical} size="sm" />
						</Button>
					</Dropdown.Trigger>
					<Dropdown.Menu>
						<Dropdown.Item onclick={() => (editOpen = true)}>
							<Icon icon={Edit} size="sm" /> Edit
						</Dropdown.Item>
						{#if item.is_active}
							<Dropdown.Item onclick={toggleActive}>
								<Icon icon={Pause} size="sm" /> Deactivate
							</Dropdown.Item>
						{:else}
							<Dropdown.Item onclick={toggleActive}>
								<Icon icon={Check} size="sm" /> Activate
							</Dropdown.Item>
						{/if}
						<Dropdown.Separator />
						<Dropdown.Item variant="danger" onclick={() => (confirmDeleteOpen = true)}>
							<Icon icon={Trash2} size="sm" /> Delete
						</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown.Root>
			</div>
		</header>

		<div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
			<!-- Left: item details -->
			<div class="stack stack-relaxed">
				<Card.Root>
					<Card.Header>
						<Card.Title>Details</Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="grid grid-cols-2 gap-x-6 gap-y-3">
							{#if item.description}
								<div class="col-span-2">
									<dt class="caption text-fg-muted">Description</dt>
									<dd class="body-base whitespace-pre-wrap">{item.description}</dd>
								</div>
							{/if}
							<div>
								<dt class="caption text-fg-muted">Category</dt>
								<dd class="body-base">{item.category ?? '—'}</dd>
							</div>
							<div>
								<dt class="caption text-fg-muted">Supplier</dt>
								<dd class="body-base">{item.supplier_name ?? '—'}</dd>
							</div>
							<div>
								<dt class="caption text-fg-muted">Unit of measure</dt>
								<dd class="body-base">{item.unit_of_measure}</dd>
							</div>
							<div>
								<dt class="caption text-fg-muted">Barcode</dt>
								<dd class="body-base">{item.barcode ?? '—'}</dd>
							</div>
							<div>
								<dt class="caption text-fg-muted">Unit price</dt>
								<dd class="body-base">{formatPrice(item.unit_price, item.currency)}</dd>
							</div>
							{#if item.cost_price != null}
								<div>
									<dt class="caption text-fg-muted">Cost price</dt>
									<dd class="body-base">{formatPrice(item.cost_price, item.currency)}</dd>
								</div>
							{/if}
							{#if item.tags && item.tags.length > 0}
								<div class="col-span-2">
									<dt class="caption text-fg-muted">Tags</dt>
									<dd>
										<div class="cluster cluster-tight">
											{#each item.tags as t (t)}
												<Badge variant="neutral" style="soft" size="sm">{t}</Badge>
											{/each}
										</div>
									</dd>
								</div>
							{/if}
							<div>
								<dt class="caption text-fg-muted">Created</dt>
								<dd class="body-base">{new Date(item.created_at).toLocaleDateString()}</dd>
							</div>
							<div>
								<dt class="caption text-fg-muted">Updated</dt>
								<dd class="body-base">{new Date(item.updated_at).toLocaleDateString()}</dd>
							</div>
						</dl>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Right: stock summary + recent history -->
			<div class="stack stack-relaxed">
				<Card.Root>
					<Card.Header>
						<Card.Title>Stock</Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="stack stack-tight">
							<div class="cluster cluster-spread">
								<dt class="caption text-fg-muted">Current</dt>
								<dd class="body-lg text-fg tabular-nums">
									<strong>{item.current_stock}</strong>
									<span class="caption text-fg-subtle"> {item.unit_of_measure}</span>
								</dd>
							</div>
							<div class="cluster cluster-spread">
								<dt class="caption text-fg-muted">Reorder point</dt>
								<dd class="body-base tabular-nums">{item.reorder_point}</dd>
							</div>
							<div class="cluster cluster-spread">
								<dt class="caption text-fg-muted">Reorder quantity</dt>
								<dd class="body-base tabular-nums">{item.reorder_quantity}</dd>
							</div>
						</dl>
					</Card.Content>
					<Card.Footer>
						<Button fullWidth onclick={() => (adjustOpen = true)}>
							<Icon icon={RotateCcw} size="sm" /> Adjust stock
						</Button>
					</Card.Footer>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Recent adjustments</Card.Title>
					</Card.Header>
					<Card.Content>
						<StockHistoryList itemId={item.id} limit={5} />
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{/if}
</div>

<EditItemDrawer bind:open={editOpen} {item} onOpenChange={(o) => (editOpen = o)} />
<AdjustStockDialog bind:open={adjustOpen} {item} onOpenChange={(o) => (adjustOpen = o)} />

{#if item}
	{@const cd = item}
	<ConfirmDialog
		bind:open={confirmDeleteOpen}
		title="Delete this item?"
		description={`${cd.sku} — ${cd.name}. This soft-deletes (deactivates) the item.`}
		confirmLabel="Delete"
		variant="danger"
		loading={deleteMutation.isPending}
		onConfirm={doDelete}
	/>
{/if}
