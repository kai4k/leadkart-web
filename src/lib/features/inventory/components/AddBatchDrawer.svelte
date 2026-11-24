<script lang="ts">
	import { getLocalTimeZone, today } from '@internationalized/date';
	import { toDateOnly } from '#lib/utils/date-only.ts';
	import { Drawer, Button, Alert } from '#lib/components/ui/index.ts';
	import { TextField, NumberInput } from '#lib/components/form/index.ts';
	import { useForm } from '#lib/hooks/use-form.svelte.ts';
	import { addBatchMutation } from '#lib/features/inventory/queries.ts';
	import {
		createBatchRequestSchema,
		type CreateBatchRequest
	} from '#lib/features/inventory/schemas.ts';
	import { Icon, X } from '#lib/icons/index.ts';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

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
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);

	// today's CALENDAR date in the browser's zone: `Date#toISOString().slice(0, 10)` is the UTC date and is a day early east of UTC
	function todayIsoDate(): string {
		return toDateOnly(today(getLocalTimeZone()));
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

	const form = useForm(createBatchRequestSchema, initial, { open: () => open, validateOn: 'blur' });

	$effect(() => {
		if (!open) form.reset();
	});

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values, current) => {
			const cleaned: CreateBatchRequest = { ...values };
			for (const key of ['supplier_name', 'supplier_invoice_no'] as const) {
				if (cleaned[key] === '') cleaned[key] = undefined;
			}
			await mutation.mutateAsync({ productId, body: cleaned });
			if (!current()) return;
			form.reset();
			onOpenChange(false);
		});
	}
</script>

<Drawer.Root bind:open busy={form.isSubmitting} {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<Drawer.Title class="h4">Add batch</Drawer.Title>
				<p class="caption text-muted-foreground">
					Record an inward batch with quantity, expiry, and supplier info.
				</p>
			</div>
			<Drawer.Close>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="hover:bg-muted rounded-md p-1.5"
						aria-label="Close"
					>
						<Icon icon={X} size="sm" />
					</button>
				{/snippet}
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
						<span class="label text-foreground">Manufactured at</span>
						<input
							type="date"
							name="manufactured_at"
							bind:value={form.values.manufactured_at}
							class="bg-card border border-border rounded-md body-sm text-foreground rounded-md px-3 py-2"
							data-testid="batch-manufactured-at"
							required
						/>
						{#if form.errors.manufactured_at}
							<span class="caption text-destructive">{form.errors.manufactured_at}</span>
						{/if}
					</label>
					<label class="stack stack-tight">
						<span class="label text-foreground">Expires at</span>
						<input
							type="date"
							name="expires_at"
							bind:value={form.values.expires_at}
							class="bg-card border border-border rounded-md body-sm text-foreground rounded-md px-3 py-2"
							data-testid="batch-expires-at"
							required
						/>
						{#if form.errors.expires_at}
							<span class="caption text-destructive" data-testid="expires-at-error"
								>{form.errors.expires_at}</span
							>
						{/if}
					</label>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<NumberInput
						label="Quantity received"
						name="quantity_received"
						bind:value={form.values.quantity_received}
						min={1}
						step={1}
						error={form.errors.quantity_received}
					/>
					<NumberInput
						label="Purchase rate"
						name="purchase_rate"
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
					<Alert variant="destructive" title="Couldn't add batch">{form.bannerError}</Alert>
				{/if}
			</form>
		</Drawer.Body>

		<Drawer.Footer>
			<Drawer.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
				{/snippet}
			</Drawer.Close>
			<Button type="submit" form="add-batch-form" loading={form.isSubmitting}>Add batch</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
