<!--
	CancelOrderDialog — gated by a non-empty reason. Wraps the cancel
	mutation; the parent owns `open` so the action button can open it.
-->
<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { Alert, Button, Dialog } from '$ui';
	import { TextField } from '$form';
	import { useForm } from '#lib/hooks/index.ts';
	import { cancelOrderRequestSchema } from '$features/orders/schemas';
	import { cancelOrderMutation } from '$features/orders/queries';

	type Props = {
		orderId: string;
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onCancelled?: () => void;
	};
	let { orderId, open = $bindable(false), onOpenChange, onCancelled }: Props = $props();

	const cancelM = cancelOrderMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, cancelM);
	const form = useForm(cancelOrderRequestSchema, { reason: '' }, { open: () => open });

	async function handleSubmit(e: SubmitEvent) {
		await runSubmit(e);
	}

	async function runSubmit(e?: SubmitEvent) {
		const synthetic = e ?? (new Event('submit') as unknown as SubmitEvent);
		await form.submit(synthetic, async (values, current) => {
			await cancelM.mutateAsync({ id: orderId, ...values });
			if (!current()) return;
			onOpenChange(false);
			form.reset();
			onCancelled?.();
		});
	}
</script>

<Dialog.Root bind:open busy={form.isSubmitting} {onOpenChange}>
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
					<Alert variant="destructive" title="Failed to cancel">{form.bannerError}</Alert>
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
					variant="destructive"
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
