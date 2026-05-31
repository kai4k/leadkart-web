<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField, NumberInput } from '$form';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { addBatchMutation } from '$features/inventory/queries';
	import { createBatchRequestSchema, type CreateBatchRequest } from '$features/inventory/schemas';
	import { Icon, X } from '$icons';

	/**
	 * AddBatchDrawer — record inward batch.
	 *
	 * Submits to POST /inventory/products/{id}/batches which records
	 * the batch + an inward StockMovement atomically.
	 *
	 * Client-side validation: expires_at must be after manufactured_at
	 * (per createBatchRequestSchema refinement).
	 */
	type Props = {
		open: boolean;
		productId: string;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), productId, onOpenChange }: Props = $props();

	const mutation = addBatchMutation();

	function todayIsoDate(): string {
		const d = new Date();
		return d.toISOString().slice(0, 10);
	}

	const initial: CreateBatchRequest = {
		batch_number: '',
		manufactured_at: todayIsoDate(),
		expires_at: '',
		quantity_received: 1,
		purchase_rate: 0,
		inward_date: todayIsoDate(),
		supplier_name: '',
		supplier_invoice_no: ''
	};

	const form = useForm(createBatchRequestSchema, initial, { validateOn: 'blur' });

	$effect(() => {
		if (!open) form.reset();
	});

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			const cleaned: CreateBatchRequest = { ...values };
			for (const key of ['supplier_name', 'supplier_invoice_no'] as const) {
				if (cleaned[key] === '') cleaned[key] = undefined;
			}
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(
					{ productId, body: cleaned },
					{
						onSuccess: () => {
							form.reset();
							onOpenChange(false);
							resolve();
						},
						onError: (err) => reject(err)
					}
				);
			});
		});
	}
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Add batch</h2>
				<p class="caption text-fg-muted">
					Record an inward batch with quantity, expiry, and supplier info.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close">
					<Icon icon={X} size="sm" />
				</button>
			</Drawer.Close>
		</Drawer.Header>

		<Drawer.Body>
			<form id="add-batch-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<TextField
					label="Batch number"
					name="batch_number"
					placeholder="e.g. ABC1234"
					bind:value={form.values.batch_number}
					required
					maxlength={100}
					error={form.errors.batch_number}
					onblur={() => form.validateField('batch_number')}
				/>

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="stack stack-tight">
						<span class="label text-fg">Manufactured at</span>
						<input
							type="date"
							name="manufactured_at"
							bind:value={form.values.manufactured_at}
							class="bg-bg-elevated border border-border rounded-md body-sm text-fg rounded-md px-3 py-2"
							data-testid="batch-manufactured-at"
							required
						/>
						{#if form.errors.manufactured_at}
							<span class="caption text-danger-700">{form.errors.manufactured_at}</span>
						{/if}
					</label>
					<label class="stack stack-tight">
						<span class="label text-fg">Expires at</span>
						<input
							type="date"
							name="expires_at"
							bind:value={form.values.expires_at}
							class="bg-bg-elevated border border-border rounded-md body-sm text-fg rounded-md px-3 py-2"
							data-testid="batch-expires-at"
							required
						/>
						{#if form.errors.expires_at}
							<span class="caption text-danger-700" data-testid="expires-at-error"
								>{form.errors.expires_at}</span
							>
						{/if}
					</label>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<NumberInput
						label="Quantity received"
						bind:value={form.values.quantity_received}
						min={1}
						step={1}
						error={form.errors.quantity_received}
					/>
					<NumberInput
						label="Purchase rate"
						bind:value={form.values.purchase_rate}
						min={0}
						step={0.01}
						precision={2}
						prefix="₹"
						error={form.errors.purchase_rate}
					/>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<TextField
						label="Supplier"
						name="supplier_name"
						bind:value={form.values.supplier_name}
						maxlength={200}
					/>
					<TextField
						label="Supplier invoice no."
						name="supplier_invoice_no"
						bind:value={form.values.supplier_invoice_no}
						maxlength={100}
					/>
				</div>

				{#if form.bannerError}
					<Alert variant="danger" title="Couldn't add batch">{form.bannerError}</Alert>
				{/if}
			</form>
		</Drawer.Body>

		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="add-batch-form" loading={form.isSubmitting}>Add batch</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
