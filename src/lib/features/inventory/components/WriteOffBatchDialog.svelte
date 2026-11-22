<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { Dialog, Button, Alert } from '$ui';
	import { useForm } from '#lib/hooks/use-form.svelte.ts';
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
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);
	const form = useForm(
		writeOffBatchRequestSchema,
		{ reason: '' },
		{ open: () => open, validateOn: 'blur' }
	);

	$effect(() => {
		if (!open) form.reset();
	});

	async function onSubmit(e: SubmitEvent) {
		if (!batch) return;
		await form.submit(e, async (values, current) => {
			await mutation.mutateAsync({ productId, batchId: batch.id, body: values });
			if (!current()) return;
			form.reset();
			onOpenChange(false);
		});
	}
</script>

<Dialog.Root bind:open busy={form.isSubmitting} {onOpenChange}>
	<Dialog.Content size="xl">
		<Dialog.Header>
			<div class="stack stack-tight">
				<Dialog.Title class="h5 text-base">Write off batch</Dialog.Title>
				{#if batch}
					<p class="caption text-muted-foreground">
						Batch <code>{batch.batch_number}</code> · {batch.quantity_available} available
					</p>
				{/if}
			</div>
		</Dialog.Header>
		<Dialog.Body>
			<form id="write-off-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<Alert variant="warning" role="note">
					This permanently writes off the batch. Stock movements are preserved.
				</Alert>
				<label class="stack stack-tight">
					<span class="label text-foreground">Reason</span>
					<textarea
						name="reason"
						bind:value={form.values.reason}
						maxlength={500}
						rows={3}
						placeholder="e.g. damaged in transit; failed QC"
						required
						class="bg-card border border-border rounded-md body-sm text-foreground w-full rounded-md px-3 py-2"
						data-testid="write-off-reason"
					></textarea>
					{#if form.errors.reason}
						<span class="caption text-destructive">{form.errors.reason}</span>
					{/if}
				</label>
				{#if form.bannerError}
					<Alert variant="destructive" title="Couldn't write off batch">{form.bannerError}</Alert>
				{/if}
			</form>
		</Dialog.Body>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
				{/snippet}
			</Dialog.Close>
			<Button type="submit" form="write-off-form" variant="destructive" loading={form.isSubmitting}>
				Write off
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
