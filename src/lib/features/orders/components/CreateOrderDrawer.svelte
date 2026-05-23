<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField } from '$lib/components/form';
	import OrderLineItemsEditor from './OrderLineItemsEditor.svelte';
	import { createOrderMutation } from '$features/orders/queries';
	import { createOrderRequestSchema } from '$features/orders/schemas';
	import { computeOrderTotals, formatMoney } from '$features/orders/view-models';
	import { useForm } from '$lib/hooks/use-form.svelte';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = createOrderMutation();
	const form = useForm(
		createOrderRequestSchema,
		{
			customer_lead_id: '',
			customer_name: '',
			customer_email: '',
			items: [],
			currency: 'USD',
			expected_delivery_at: '',
			notes: ''
		},
		{ validateOn: 'blur' }
	);

	const totals = $derived(computeOrderTotals(form.values.items));

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			// Strip empty strings from optional fields before POST.
			const payload = {
				...values,
				customer_email: values.customer_email?.length ? values.customer_email : undefined,
				expected_delivery_at: values.expected_delivery_at?.length
					? values.expected_delivery_at
					: undefined,
				notes: values.notes?.length ? values.notes : undefined
			};
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(payload, {
					onSuccess: () => {
						form.reset();
						onOpenChange(false);
						resolve();
					},
					onError: (err) => reject(err)
				});
			});
		});
	}
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Create order</h2>
				<p class="caption text-fg-muted">
					Pick the customer lead, add line items, and we'll issue the order number.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			<form id="create-order-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<TextField
					label="Customer lead ID"
					name="customer_lead_id"
					placeholder="UUID of the customer lead"
					bind:value={form.values.customer_lead_id}
					required
					error={form.errors.customer_lead_id}
					onblur={() => form.validateField('customer_lead_id')}
				/>
				<TextField
					label="Customer name"
					name="customer_name"
					placeholder="As it should appear on the order"
					bind:value={form.values.customer_name as unknown as string}
					error={form.errors.customer_name}
				/>
				<TextField
					label="Customer email"
					name="customer_email"
					type="email"
					placeholder="optional"
					bind:value={form.values.customer_email as unknown as string}
					error={form.errors.customer_email}
				/>

				<OrderLineItemsEditor
					items={form.values.items}
					currency={form.values.currency}
					error={form.errors.items}
					onChange={(next) => (form.values.items = next)}
				/>

				<div
					class="bg-bg-muted text-fg flex flex-col gap-1 rounded-md p-3 text-sm tabular-nums"
					data-testid="order-totals-preview"
				>
					<div class="cluster cluster-spread">
						<span class="text-fg-muted">Subtotal</span>
						<span>{formatMoney(totals.subtotal, form.values.currency)}</span>
					</div>
					<div class="cluster cluster-spread">
						<span class="text-fg-muted">Discount</span>
						<span>−{formatMoney(totals.discount_total, form.values.currency)}</span>
					</div>
					<div class="cluster cluster-spread">
						<span class="text-fg-muted">Tax</span>
						<span>{formatMoney(totals.tax_total, form.values.currency)}</span>
					</div>
					<div class="border-border cluster cluster-spread border-t pt-1">
						<span class="label text-fg">Total</span>
						<span class="label text-fg">{formatMoney(totals.total, form.values.currency)}</span>
					</div>
				</div>

				<TextField
					label="Currency"
					name="currency"
					maxlength={3}
					bind:value={form.values.currency as unknown as string}
					error={form.errors.currency}
				/>
				<label class="stack stack-tight">
					<span class="label">Notes</span>
					<textarea
						bind:value={form.values.notes as unknown as string}
						maxlength={4000}
						rows={3}
						class="glass-input w-full rounded-md px-3 py-2 text-sm"
					></textarea>
				</label>

				{#if form.bannerError}<Alert variant="danger">{form.bannerError}</Alert>{/if}
			</form>
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="create-order-form" loading={form.isSubmitting}>
				Create order
			</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
