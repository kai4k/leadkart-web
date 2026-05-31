<script lang="ts">
	import { Dialog, Button, Alert } from '$ui';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { writeOffBatchMutation } from '$features/inventory/queries';
	import { writeOffBatchRequestSchema, type BatchDto } from '$features/inventory/schemas';

	type Props = {
		open: boolean;
		productId: string;
		batch: BatchDto | null;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), productId, batch, onOpenChange }: Props = $props();

	const mutation = writeOffBatchMutation();
	const form = useForm(writeOffBatchRequestSchema, { reason: '' }, { validateOn: 'blur' });

	$effect(() => {
		if (!open) form.reset();
	});

	async function onSubmit(e: SubmitEvent) {
		if (!batch) return;
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(
					{ productId, batchId: batch.id, body: values },
					{
						onSuccess: () => {
							form.reset();
							onOpenChange(false);
							resolve();
						},
						onError: (err) => reject(err)
					}
				);
			});
		});
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content>
		<Dialog.Header>
			<div class="stack stack-tight">
				<h2 class="h5">Write off batch</h2>
				{#if batch}
					<p class="caption text-fg-muted">
						Batch <code>{batch.batch_number}</code> · {batch.quantity_available} available
					</p>
				{/if}
			</div>
		</Dialog.Header>
		<Dialog.Body>
			<form id="write-off-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<Alert variant="warning">
					This permanently writes off the batch. Stock movements are preserved.
				</Alert>
				<label class="stack stack-tight">
					<span class="label text-fg">Reason</span>
					<textarea
						bind:value={form.values.reason}
						maxlength={500}
						rows={3}
						placeholder="e.g. damaged in transit; failed QC"
						required
						class="bg-bg-elevated border border-border rounded-md body-sm text-fg w-full rounded-md px-3 py-2"
						data-testid="write-off-reason"
					></textarea>
					{#if form.errors.reason}
						<span class="caption text-danger-700">{form.errors.reason}</span>
					{/if}
				</label>
				{#if form.bannerError}
					<Alert variant="danger" title="Couldn't write off batch">{form.bannerError}</Alert>
				{/if}
			</form>
		</Dialog.Body>
		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Dialog.Close>
			<Button type="submit" form="write-off-form" variant="danger" loading={form.isSubmitting}>
				Write off
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
