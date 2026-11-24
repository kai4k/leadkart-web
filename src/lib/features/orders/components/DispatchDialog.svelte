<!--
	DispatchDialog — captures carrier + tracking number for the
	consignment note. An order becomes dispatched only when the goods leave
	(Go ADR 0072), not when the note is created.
-->
<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { Alert, Button, Dialog } from '#lib/components/ui/index.ts';
	import { TextField } from '#lib/components/form/index.ts';
	import { useForm } from '#lib/hooks/index.ts';
	import { dispatchRequestSchema } from '#lib/features/orders/schemas.ts';
	import { dispatchOrderMutation } from '#lib/features/orders/queries.ts';

	type Props = {
		orderId: string;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};
	let { orderId, open = $bindable(false), onOpenChange }: Props = $props();

	const dispatchM = dispatchOrderMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, dispatchM);
	const form = useForm(
		dispatchRequestSchema,
		{
			carrier: '',
			tracking_number: '',
			notes: ''
		},
		{ open: () => open }
	);

	async function handleSubmit(e: SubmitEvent) {
		await form.submit(e, async (values, current) => {
			await dispatchM.mutateAsync({ id: orderId, ...values });
			if (!current()) return;
			onOpenChange(false);
			form.reset();
		});
	}
</script>

<Dialog.Root bind:open busy={form.isSubmitting} {onOpenChange}>
	<Dialog.Content size="xl">
		<Dialog.Header>
			<Dialog.Title class="h5 text-base">Dispatch order</Dialog.Title>
			<p class="body-sm text-muted-foreground">
				Creates a consignment note in Dispatch. The order shows as dispatched only once the goods
				have left.
			</p>
		</Dialog.Header>
		<form id="dispatch-form" onsubmit={handleSubmit}>
			<Dialog.Body>
				{#if form.bannerError}
					<Alert variant="destructive" title="Failed to dispatch">{form.bannerError}</Alert>
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
					{#snippet child({ props })}
						<Button {...props} variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
					{/snippet}
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
