<script lang="ts">
	import { ConfirmDialog } from '$ui';
	import { quarantineBatchMutation } from '$features/inventory/queries';
	import type { BatchDto } from '$features/inventory/schemas';

	type Props = {
		open: boolean;
		productId: string;
		batch: BatchDto | null;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), productId, batch, onOpenChange }: Props = $props();

	const mutation = quarantineBatchMutation();

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
