<!--
	RecordPaymentDialog — records either a token (pre-confirm) or full
	(post-delivery) payment. The dialog defaults `kind` based on the
	order's current status; the parent can override.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Alert, Button, Dialog } from '$ui';
	import { NumberInput, RadioGroup, RadioItem, Select, TextField } from '$form';
	import { useForm } from '$lib/hooks';
	import { recordPaymentRequestSchema, type PaymentKind } from '$features/orders/schemas';
	import { recordPaymentMutation } from '$features/orders/queries';
	import { outstandingBalance } from '$features/orders/view-models';
	import type { OrderDto } from '$features/orders/schemas';

	type Props = {
		order: OrderDto;
		open: boolean;
		onOpenChange: (open: boolean) => void;
		defaultKind?: PaymentKind;
	};
	let { order, open = $bindable(false), onOpenChange, defaultKind }: Props = $props();

	const recordM = recordPaymentMutation(untrack(() => order.id));

	const initialKind: PaymentKind = $derived(
		defaultKind ?? (order.status === 'quotation_approved' ? 'token' : 'full')
	);
	const initialAmount = $derived(outstandingBalance(order));

	const form = useForm(recordPaymentRequestSchema, {
		kind: untrack(() => initialKind),
		amount: untrack(() => initialAmount),
		method: 'upi',
		reference: ''
	});

	// Sync initial values when the dialog opens with a new context.
	$effect(() => {
		if (open) {
			form.values.kind = initialKind;
			form.values.amount = initialAmount;
		}
	});

	const methodOptions = [
		{ value: 'cash', label: 'Cash' },
		{ value: 'upi', label: 'UPI' },
		{ value: 'bank_transfer', label: 'Bank transfer' },
		{ value: 'cheque', label: 'Cheque' },
		{ value: 'card', label: 'Card' },
		{ value: 'other', label: 'Other' }
	];

	async function handleSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				recordM.mutate(values, {
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
			<h2 class="h5">Record payment</h2>
		</Dialog.Header>
		<form id="record-payment-form" onsubmit={handleSubmit}>
			<Dialog.Body>
				{#if form.bannerError}
					<Alert variant="danger" title="Failed to record payment">{form.bannerError}</Alert>
				{/if}

				<div class="stack stack-relaxed">
					<RadioGroup
						label="Kind"
						bind:value={form.values.kind}
						orientation="horizontal"
						error={form.errors.kind}
					>
						<RadioItem value="token" label="Token" />
						<RadioItem value="full" label="Full" />
					</RadioGroup>

					<NumberInput
						label="Amount"
						bind:value={form.values.amount}
						min={0}
						step={1}
						precision={2}
						prefix="₹"
						error={form.errors.amount}
					/>

					<Select
						label="Method"
						bind:value={form.values.method}
						options={methodOptions}
						error={form.errors.method}
					/>

					<TextField
						label="Reference"
						name="reference"
						bind:value={form.values.reference}
						placeholder="UTR / cheque no. / card last 4"
						error={form.errors.reference}
					/>
				</div>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close>
					<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
				</Dialog.Close>
				<Button
					type="submit"
					form="record-payment-form"
					loading={form.isSubmitting}
					data-testid="record-payment-submit"
				>
					Record payment
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
