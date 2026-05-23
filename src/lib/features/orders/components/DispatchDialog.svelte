<!--
	DispatchDialog — captures carrier + tracking number for the
	dispatched transition. Dispatch is a cross-module placeholder; the
	endpoint creates a consignment in the Dispatch service via outbox.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Alert, Button, Dialog } from '$ui';
	import { TextField } from '$form';
	import { useForm } from '$lib/hooks';
	import { dispatchRequestSchema } from '$features/orders/schemas';
	import { dispatchOrderMutation } from '$features/orders/queries';

	type Props = {
		orderId: string;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};
	let { orderId, open = $bindable(false), onOpenChange }: Props = $props();

	const dispatchM = dispatchOrderMutation(untrack(() => orderId));
	const form = useForm(dispatchRequestSchema, {
		carrier: '',
		tracking_number: '',
		notes: ''
	});

	async function handleSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				dispatchM.mutate(values, {
					onSuccess: () => {
						onOpenChange(false);
						form.reset();
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
			<h2 class="h5">Dispatch order</h2>
			<p class="body-sm text-fg-muted">
				Creates a consignment note in Dispatch and flips the order to dispatched.
			</p>
		</Dialog.Header>
		<form id="dispatch-form" onsubmit={handleSubmit}>
			<Dialog.Body>
				{#if form.bannerError}
					<Alert variant="danger" title="Failed to dispatch">{form.bannerError}</Alert>
				{/if}
				<div class="stack stack-relaxed">
					<TextField
						label="Carrier"
						name="carrier"
						bind:value={form.values.carrier}
						error={form.errors.carrier}
						data-testid="dispatch-carrier"
					/>
					<TextField
						label="Tracking number"
						name="tracking_number"
						bind:value={form.values.tracking_number}
						error={form.errors.tracking_number}
						data-testid="dispatch-tracking-number"
					/>
				</div>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close>
					<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
				</Dialog.Close>
				<Button
					type="submit"
					form="dispatch-form"
					loading={form.isSubmitting}
					data-testid="dispatch-submit"
				>
					Dispatch
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
