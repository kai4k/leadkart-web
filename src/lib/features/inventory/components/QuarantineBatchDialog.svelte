<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { ConfirmDialog } from '#lib/components/ui/index.ts';
	import { quarantineBatchMutation } from '#lib/features/inventory/queries.ts';
	import type { BatchDto } from '#lib/features/inventory/schemas.ts';

	type Props = {
		open: boolean;
		productId: string;
		batch: BatchDto | null;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), productId, batch, onOpenChange }: Props = $props();

	const mutation = quarantineBatchMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);

	function doQuarantine() {
		if (!batch) return;
		mutation.mutate(
			{ productId, batchId: batch.id },
			{
				onSettled: () => onOpenChange(false)
			}
		);
	}
</script>

{#if batch}
	<ConfirmDialog
		bind:open
		title="Quarantine batch?"
		description={`Batch ${batch.batch_number} will be held back from sale (${batch.quantity_available} units). You can lift the quarantine later.`}
		confirmLabel="Quarantine"
		variant="warning"
		loading={mutation.isPending}
		onConfirm={doQuarantine}
		{onOpenChange}
	/>
{/if}
