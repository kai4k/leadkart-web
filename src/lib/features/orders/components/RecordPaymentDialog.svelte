<!--
	RecordPaymentDialog — records either a token (pre-confirm) or full
	(post-delivery) payment. The dialog defaults `kind` based on the
	order's current status; the parent can override.
-->
<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { untrack } from 'svelte';
	import { Alert, Button, Dialog } from '#lib/components/ui/index.ts';
	import {
		NumberInput,
		RadioGroup,
		RadioItem,
		Select,
		TextField
	} from '#lib/components/form/index.ts';
	import { useForm } from '#lib/hooks/index.ts';
	import {
		recordPaymentRequestSchema,
		type PaymentKind,
		type OrderDto
	} from '#lib/features/orders/schemas.ts';
	import { recordPaymentMutation } from '#lib/features/orders/queries.ts';
	import { outstandingBalance } from '#lib/features/orders/view-models.ts';

	type Props = {
		order: OrderDto;
		open: boolean;
		onOpenChange: (open: boolean) => void;
		defaultKind?: PaymentKind;
	};
	let { order, open = $bindable(false), onOpenChange, defaultKind }: Props = $props();

	const recordM = recordPaymentMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, recordM);

	const initialKind: PaymentKind = $derived(
		defaultKind ?? (order.status === 'quotation_approved' ? 'token' : 'full')
	);
	const initialAmount = $derived(outstandingBalance(order));

	const form = useForm(
		recordPaymentRequestSchema,
		{
			kind: untrack(() => initialKind),
			amount: untrack(() => initialAmount),
			method: 'upi',
			reference: ''
		},
		{ open: () => open }
	);

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
		await form.submit(e, async (values, current) => {
			await recordM.mutateAsync({ id: order.id, ...values });
			if (!current()) return;
			onOpenChange(false);
			form.reset();
		});
	}
</script>

<Dialog.Root bind:open busy={form.isSubmitting} {onOpenChange}>
	<Dialog.Content size="xl">
		<Dialog.Header>
			<Dialog.Title class="h5 text-base">Record payment</Dialog.Title>
		</Dialog.Header>
		<form id="record-payment-form" onsubmit={handleSubmit}>
			<Dialog.Body>
				{#if form.bannerError}
					<Alert variant="destructive" title="Failed to record payment">{form.bannerError}</Alert>
				{/if}

				<div class="stack stack-relaxed">
					<RadioGroup
						label="Kind"
						name="kind"
						bind:value={form.values.kind}
						orientation="horizontal"
						error={form.errors.kind}
					>
						<RadioItem value="token" label="Token" />
						<RadioItem value="full" label="Full" />
					</RadioGroup>

					<NumberInput
						label="Amount"
						name="amount"
						bind:value={form.values.amount}
						min={0}
						step={1}
						precision={2}
						prefix="₹"
						error={form.errors.amount}
					/>

					<Select
						label="Method"
						name="method"
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
					{#snippet child({ props })}
						<Button {...props} variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
					{/snippet}
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
