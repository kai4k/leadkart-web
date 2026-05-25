<!--
	CancelOrderDialog — gated by a non-empty reason. Wraps the cancel
	mutation; the parent owns `open` so the action button can open it.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Alert, Button, Dialog } from '$ui';
	import { TextField } from '$form';
	import { useForm } from '$lib/hooks';
	import { cancelOrderRequestSchema } from '$features/orders/schemas';
	import { cancelOrderMutation } from '$features/orders/queries';

	type Props = {
		orderId: string;
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onCancelled?: () => void;
	};
	let { orderId, open = $bindable(false), onOpenChange, onCancelled }: Props = $props();

	const cancelM = cancelOrderMutation(untrack(() => orderId));
	const form = useForm(cancelOrderRequestSchema, { reason: '' });

	async function handleSubmit(e: SubmitEvent) {
		await runSubmit(e);
	}

	async function runSubmit(e?: SubmitEvent) {
		const synthetic = e ?? (new Event('submit') as unknown as SubmitEvent);
		await form.submit(synthetic, async (values) => {
			await new Promise<void>((resolve, reject) => {
				cancelM.mutate(values, {
					onSuccess: () => {
						onOpenChange(false);
						form.reset();
						onCancelled?.();
						resolve();
					},
					onError: (err) => reject(err)
				});
			});
		});
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content>
		<Dialog.Header>
			<h2 class="h5">Cancel order</h2>
			<p class="body-sm text-fg-muted">
				Cancelling triggers compensation: stock unreserve, invoice cancellation, and a credit note
				if an invoice was already issued.
			</p>
		</Dialog.Header>
		<form id="cancel-order-form" onsubmit={handleSubmit}>
			<Dialog.Body>
				{#if form.bannerError}
					<Alert variant="danger" title="Failed to cancel">{form.bannerError}</Alert>
				{/if}
				<TextField
					label="Reason"
					name="reason"
					bind:value={form.values.reason}
					error={form.errors.reason}
					data-testid="cancel-reason"
				/>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close>
					<Button variant="ghost" disabled={form.isSubmitting}>Back</Button>
				</Dialog.Close>
				<Button
					type="button"
					variant="danger"
					loading={form.isSubmitting}
					onclick={() => runSubmit()}
					data-testid="cancel-order-submit"
				>
					Cancel order
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
