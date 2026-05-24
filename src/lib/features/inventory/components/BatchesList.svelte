<script lang="ts">
	import { Badge, Button, Dropdown, EmptyState, Skeleton } from '$ui';
	import { Icon, Plus, MoreVertical, Pause, Trash2, RotateCcw, Boxes } from '$icons';
	import { batchesQuery } from '$features/inventory/queries';
	import { expiryStatus, fefoSort, formatPrice } from '$features/inventory/view-models';
	import type { BatchDto } from '$features/inventory/schemas';
	import { AuthError, NetworkError, NotFoundError } from '$api/errors';
	import AddBatchDrawer from './AddBatchDrawer.svelte';
	import AdjustStockDialog from './AdjustStockDialog.svelte';
	import WriteOffBatchDialog from './WriteOffBatchDialog.svelte';
	import QuarantineBatchDialog from './QuarantineBatchDialog.svelte';

	/**
	 * BatchesList — FEFO-ordered table of batches for a product.
	 *
	 * Each row: batch_number, manufactured/expires (traffic-light pill),
	 * quantity_available (clickable → AdjustStockDialog scoped to batch),
	 * supplier, status badges. Row actions: Adjust / Quarantine / Write-off.
	 */
	type Props = { productId: string };
	let { productId }: Props = $props();

	const query = $derived(batchesQuery(productId, { include_written_off: false }));
	const batches = $derived(fefoSort(query.data?.items ?? []));

	let addBatchOpen = $state(false);
	let adjustOpen = $state(false);
	let writeOffOpen = $state(false);
	let quarantineOpen = $state(false);
	let activeBatch: BatchDto | null = $state(null);

	function openAdjust(b: BatchDto) {
		activeBatch = b;
		adjustOpen = true;
	}
	function openWriteOff(b: BatchDto) {
		activeBatch = b;
		writeOffOpen = true;
	}
	function openQuarantine(b: BatchDto) {
		activeBatch = b;
		quarantineOpen = true;
	}

	const isEmpty = $derived(!query.isPending && !query.isError && batches.length === 0);

	const errorCopy = $derived.by(() => {
		const err = query.error;
		if (!err) return '';
		if (err instanceof NetworkError) return 'Check your network connection and try again.';
		if (err instanceof AuthError)
			return err.status === 403
				? "You don't have permission to view batches."
				: 'Your session expired. Sign in again.';
		if (err instanceof NotFoundError) return 'This product was deleted or moved.';
		return 'Something went wrong. Please try again.';
	});
</script>

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h2 class="h5">Batches</h2>
			<p class="caption text-fg-muted">First-Expiry-First-Out (FEFO) ordering.</p>
		</div>
		<Button onclick={() => (addBatchOpen = true)} data-testid="add-batch">
			<Icon icon={Plus} size="sm" /> Add batch
		</Button>
	</header>

	{#if query.isError}
		<div class="border-danger-500 text-danger-700 rounded-md border p-4">
			Couldn't load batches. {errorCopy}
		</div>
	{:else if isEmpty}
		<EmptyState
			icon={Boxes}
			title="No batches yet"
			description="Inward your first batch to start tracking stock."
		>
			{#snippet action()}
				<Button onclick={() => (addBatchOpen = true)}>
					<Icon icon={Plus} size="sm" /> Add batch
				</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-left" data-testid="batches-table">
				<thead>
					<tr class="border-border border-b">
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Batch
						</th>
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Expires
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase md:table-cell"
						>
							Manufactured
						</th>
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Available
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
						>
							Supplier
						</th>
						<th
							class="text-fg-muted hidden px-3 py-3 text-xs font-medium tracking-wide uppercase lg:table-cell"
						>
							Purchase rate
						</th>
						<th class="text-fg-muted px-3 py-3 text-xs font-medium tracking-wide uppercase">
							Status
						</th>
						<th class="w-12"></th>
					</tr>
				</thead>
				<tbody>
					{#if query.isPending}
						{#each [0, 1, 2] as i (i)}
							<tr class="border-border border-b">
								<td class="px-3 py-3"><Skeleton class="h-4 w-32" /></td>
								<td class="px-3 py-3"><Skeleton class="h-5 w-20 rounded-full" /></td>
								<td class="hidden px-3 py-3 md:table-cell"><Skeleton class="h-4 w-20" /></td>
								<td class="px-3 py-3"><Skeleton class="h-4 w-12" /></td>
								<td class="hidden px-3 py-3 lg:table-cell"><Skeleton class="h-4 w-24" /></td>
								<td class="hidden px-3 py-3 lg:table-cell"><Skeleton class="h-4 w-16" /></td>
								<td class="px-3 py-3"><Skeleton class="h-5 w-16 rounded-full" /></td>
								<td></td>
							</tr>
						{/each}
					{:else}
						{#each batches as batch (batch.id)}
							{@const expiry = expiryStatus(batch.expires_at)}
							<tr
								class={[
									'border-border border-b',
									(batch.is_written_off || batch.is_quarantined) && 'opacity-60'
								]}
								data-testid="batch-row"
								data-batch-id={batch.id}
							>
								<td class="px-3 py-3">
									<code class="caption text-fg">{batch.batch_number}</code>
								</td>
								<td class="px-3 py-3">
									{#if expiry}
										<Badge variant={expiry.variant} appearance="soft" size="sm"
											>{expiry.label}</Badge
										>
									{:else}
										<span class="caption text-fg-subtle">—</span>
									{/if}
								</td>
								<td class="caption text-fg-muted hidden px-3 py-3 md:table-cell">
									{new Date(batch.manufactured_at).toLocaleDateString()}
								</td>
								<td class="px-3 py-3">
									<button
										type="button"
										class="focus-visible:ring-focus-ring hover:bg-bg-elevated rounded-md px-1.5 py-0.5 focus-visible:ring-2 focus-visible:outline-none"
										onclick={() => openAdjust(batch)}
										data-testid={`adjust-batch-${batch.id}`}
										aria-label={`Adjust stock for batch ${batch.batch_number}, currently ${batch.quantity_available}`}
									>
										<span class="body-base text-fg tabular-nums">{batch.quantity_available}</span>
									</button>
								</td>
								<td class="caption text-fg-muted hidden px-3 py-3 lg:table-cell">
									{batch.supplier_name ?? '—'}
								</td>
								<td class="body-sm text-fg hidden px-3 py-3 tabular-nums lg:table-cell">
									{formatPrice(batch.purchase_rate)}
								</td>
								<td class="px-3 py-3">
									<div class="cluster cluster-tight">
										{#if batch.is_written_off}
											<Badge variant="danger" appearance="soft" size="sm">Written off</Badge>
										{:else if batch.is_quarantined}
											<Badge variant="warning" appearance="soft" size="sm">Quarantined</Badge>
										{:else}
											<Badge variant="success" appearance="soft" size="sm">Active</Badge>
										{/if}
									</div>
								</td>
								<td class="w-12 px-3 py-3 text-right">
									<Dropdown.Root>
										<Dropdown.Trigger>
											<Button
												variant="ghost"
												size="sm"
												aria-label={`Actions for batch ${batch.batch_number}`}
											>
												<Icon icon={MoreVertical} size="sm" />
											</Button>
										</Dropdown.Trigger>
										<Dropdown.Menu>
											<Dropdown.Item onSelect={() => openAdjust(batch)}>
												<Icon icon={RotateCcw} size="sm" /> Adjust stock
											</Dropdown.Item>
											{#if !batch.is_quarantined && !batch.is_written_off}
												<Dropdown.Item onSelect={() => openQuarantine(batch)}>
													<Icon icon={Pause} size="sm" /> Quarantine
												</Dropdown.Item>
											{/if}
											{#if !batch.is_written_off}
												<Dropdown.Separator />
												<Dropdown.Item variant="danger" onSelect={() => openWriteOff(batch)}>
													<Icon icon={Trash2} size="sm" /> Write off
												</Dropdown.Item>
											{/if}
										</Dropdown.Menu>
									</Dropdown.Root>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<AddBatchDrawer bind:open={addBatchOpen} {productId} onOpenChange={(o) => (addBatchOpen = o)} />
<AdjustStockDialog
	bind:open={adjustOpen}
	{productId}
	batch={activeBatch}
	onOpenChange={(o) => (adjustOpen = o)}
/>
<WriteOffBatchDialog
	bind:open={writeOffOpen}
	{productId}
	batch={activeBatch}
	onOpenChange={(o) => (writeOffOpen = o)}
/>
<QuarantineBatchDialog
	bind:open={quarantineOpen}
	{productId}
	batch={activeBatch}
	onOpenChange={(o) => (quarantineOpen = o)}
/>
