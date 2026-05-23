<script lang="ts">
	import { Button, ConfirmDialog } from '$ui';
	import { Icon, Trash2, XCircle, X } from '$icons';
	import { bulkOrderActionMutation } from '$features/orders/queries';
	import type { OrderDto } from '$features/orders/schemas';

	type Props = {
		selectedIds: string[];
		visibleOrders: OrderDto[];
		onClear: () => void;
	};
	let { selectedIds, visibleOrders, onClear }: Props = $props();

	const mutation = bulkOrderActionMutation();

	const selectedDraftIds = $derived(
		visibleOrders.filter((o) => o.status === 'draft' && selectedIds.includes(o.id)).map((o) => o.id)
	);
	const selectedCancellableIds = $derived(
		visibleOrders
			.filter(
				(o) => selectedIds.includes(o.id) && o.status !== 'cancelled' && o.status !== 'refunded'
			)
			.map((o) => o.id)
	);

	let cancelOpen = $state(false);
	let cancelReason = $state('');
	let cancelError: string | null = $state(null);

	let deleteOpen = $state(false);

	function openCancel() {
		cancelReason = '';
		cancelError = null;
		cancelOpen = true;
	}

	async function doCancel() {
		if (cancelReason.trim().length === 0) {
			cancelError = 'Reason is required';
			return;
		}
		await new Promise<void>((resolve) =>
			mutation.mutate(
				{
					ids: selectedCancellableIds,
					action: 'cancel',
					reason: cancelReason
				},
				{
					onSuccess: () => {
						onClear();
						cancelOpen = false;
						resolve();
					},
					onError: () => resolve()
				}
			)
		);
	}

	async function doDeleteDrafts() {
		await new Promise<void>((resolve) =>
			mutation.mutate(
				{
					ids: selectedDraftIds,
					action: 'delete_drafts'
				},
				{
					onSuccess: () => {
						onClear();
						deleteOpen = false;
						resolve();
					},
					onError: () => resolve()
				}
			)
		);
	}
</script>

{#if selectedIds.length > 0}
	<div
		class="border-border bg-bg-elevated sticky bottom-0 left-0 z-[var(--z-sticky)] -mx-4 mt-4 flex items-center justify-between border-t px-4 py-3 shadow-[var(--shadow-popover)]"
		role="region"
		aria-label="Bulk actions"
		data-testid="bulk-actions-bar"
	>
		<div class="cluster cluster-tight">
			<span class="label text-fg">{selectedIds.length} selected</span>
		</div>
		<div class="cluster cluster-tight">
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (deleteOpen = true)}
				disabled={selectedDraftIds.length === 0 || mutation.isPending}
			>
				<Icon icon={Trash2} size="xs" /> Delete drafts ({selectedDraftIds.length})
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={openCancel}
				disabled={selectedCancellableIds.length === 0 || mutation.isPending}
			>
				<Icon icon={XCircle} size="xs" /> Cancel selected ({selectedCancellableIds.length})
			</Button>
			<Button variant="ghost" size="sm" onclick={onClear}>
				<Icon icon={X} size="xs" /> Clear
			</Button>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={cancelOpen}
	title="Cancel selected orders"
	description={`Cancelling ${selectedCancellableIds.length} order(s). Provide a reason.`}
	confirmLabel="Cancel orders"
	cancelLabel="Keep orders"
	variant="danger"
	loading={mutation.isPending}
	onConfirm={doCancel}
>
	{#snippet body()}
		<label class="stack stack-tight">
			<span class="label">Reason</span>
			<textarea
				rows={3}
				class="glass-input w-full rounded-md px-3 py-2 text-sm"
				bind:value={cancelReason}
				maxlength={1024}
				data-testid="bulk-cancel-reason"
			></textarea>
			{#if cancelError}<span class="caption text-danger-700">{cancelError}</span>{/if}
		</label>
	{/snippet}
</ConfirmDialog>

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete draft orders"
	description={`Permanently delete ${selectedDraftIds.length} draft(s). This cannot be undone.`}
	confirmLabel="Delete drafts"
	variant="danger"
	loading={mutation.isPending}
	onConfirm={doDeleteDrafts}
/>
