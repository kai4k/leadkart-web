<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField } from '$lib/components/form';
	import OrderLineItemsEditor from './OrderLineItemsEditor.svelte';
	import { updateOrderMutation } from '$features/orders/queries';
	import {
		createOrderRequestSchema,
		type CreateOrderItem,
		type OrderDto
	} from '$features/orders/schemas';
	import { computeOrderTotals, formatMoney } from '$features/orders/view-models';
	import { useForm } from '$lib/hooks/use-form.svelte';

	type Props = {
		open: boolean;
		order: OrderDto;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), order, onOpenChange }: Props = $props();

	// svelte-ignore state_referenced_locally
	const mutation = updateOrderMutation(order.id);

	function fromOrder(o: OrderDto) {
		return {
			customer_lead_id: o.customer_lead_id,
			customer_name: o.customer_name,
			customer_email: o.customer_email ?? '',
			items: o.items.map<CreateOrderItem>((it) => ({
				sku: it.sku,
				name: it.name,
				quantity: it.quantity,
				unit_price: it.unit_price,
				discount: it.discount ?? 0,
				tax_rate: it.tax_rate ?? 0
			})),
			currency: o.currency,
			expected_delivery_at: o.expected_delivery_at ?? '',
			notes: o.notes ?? ''
		};
	}

	// Snapshot initial values; the $effect below keeps them in sync
	// when the parent passes a different order in.
	// svelte-ignore state_referenced_locally
	const form = useForm(createOrderRequestSchema, fromOrder(order), { validateOn: 'blur' });

	// Reset form values whenever a different order is passed in.
	// svelte-ignore state_referenced_locally
	let lastOrderId = $state(order.id);
	$effect(() => {
		if (order.id !== lastOrderId) {
			lastOrderId = order.id;
			form.values = fromOrder(order);
		}
	});

	const totals = $derived(computeOrderTotals(form.values.items));

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
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
				<h2 class="h4">Edit order {order.order_number}</h2>
				<p class="caption text-fg-muted">
					You can edit drafts and pending orders. Confirmed and beyond are append-only via state
					transitions.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			<form id="edit-order-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<TextField
					label="Customer lead ID"
					name="customer_lead_id"
					bind:value={form.values.customer_lead_id}
					required
					error={form.errors.customer_lead_id}
				/>
				<TextField
					label="Customer name"
					name="customer_name"
					bind:value={form.values.customer_name as unknown as string}
					error={form.errors.customer_name}
				/>
				<TextField
					label="Customer email"
					name="customer_email"
					type="email"
					bind:value={form.values.customer_email as unknown as string}
					error={form.errors.customer_email}
				/>

				<OrderLineItemsEditor
					items={form.values.items}
					currency={form.values.currency}
					error={form.errors.items}
					onChange={(next) => (form.values.items = next)}
				/>

				<div class="bg-bg-muted text-fg flex flex-col gap-1 rounded-md p-3 text-sm tabular-nums">
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
			<Button type="submit" form="edit-order-form" loading={form.isSubmitting}>Save changes</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
