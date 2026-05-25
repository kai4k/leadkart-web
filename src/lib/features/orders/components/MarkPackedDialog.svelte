<!--
	MarkPackedDialog — captures box count for the packed transition.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Alert, Button, Dialog } from '$ui';
	import { NumberInput } from '$form';
	import { useForm } from '$lib/hooks';
	import { markPackedRequestSchema } from '$features/orders/schemas';
	import { markPackedMutation } from '$features/orders/queries';

	type Props = {
		orderId: string;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};
	let { orderId, open = $bindable(false), onOpenChange }: Props = $props();

	const packM = markPackedMutation(untrack(() => orderId));
	const form = useForm(markPackedRequestSchema, { box_count: 1 });

	async function handleSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				packM.mutate(values, {
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
			<h2 class="h5">Mark packed</h2>
		</Dialog.Header>
		<form id="mark-packed-form" onsubmit={handleSubmit}>
			<Dialog.Body>
				{#if form.bannerError}
					<Alert variant="danger" title="Failed to mark packed">{form.bannerError}</Alert>
				{/if}
				<NumberInput
					label="Box count"
					bind:value={form.values.box_count}
					min={1}
					step={1}
					error={form.errors.box_count}
				/>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close>
					<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
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
