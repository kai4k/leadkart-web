<!--
	MarkPackedDialog — captures box count for the packed transition.
-->
<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { Alert, Button, Dialog } from '$ui';
	import { NumberInput } from '$form';
	import { useForm } from '#lib/hooks/index.ts';
	import { markPackedRequestSchema } from '$features/orders/schemas';
	import { markPackedMutation } from '$features/orders/queries';

	type Props = {
		orderId: string;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};
	let { orderId, open = $bindable(false), onOpenChange }: Props = $props();

	const packM = markPackedMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, packM);
	const form = useForm(markPackedRequestSchema, { box_count: 1 }, { open: () => open });

	async function handleSubmit(e: SubmitEvent) {
		await form.submit(e, async (values, current) => {
			await packM.mutateAsync({ id: orderId, ...values });
			if (!current()) return;
			onOpenChange(false);
			form.reset();
		});
	}
</script>

<Dialog.Root bind:open busy={form.isSubmitting} {onOpenChange}>
	<Dialog.Content size="xl">
		<Dialog.Header>
			<Dialog.Title class="h5 text-base">Mark packed</Dialog.Title>
		</Dialog.Header>
		<form id="mark-packed-form" onsubmit={handleSubmit}>
			<Dialog.Body>
				{#if form.bannerError}
					<Alert variant="destructive" title="Failed to mark packed">{form.bannerError}</Alert>
				{/if}
				<NumberInput
					label="Box count"
					name="box_count"
					bind:value={form.values.box_count}
					min={1}
					step={1}
					error={form.errors.box_count}
				/>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
					{/snippet}
				</Dialog.Close>
				<Button
					type="submit"
					form="mark-packed-form"
					loading={form.isSubmitting}
					data-testid="mark-packed-submit"
				>
					Mark packed
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
