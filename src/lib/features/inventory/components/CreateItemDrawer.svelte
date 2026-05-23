<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField, Select, type SelectOption } from '$form';
	import { useForm } from '$lib/utils/use-form.svelte';
	import { createInventoryItemMutation } from '$features/inventory/queries';
	import {
		createInventoryItemSchema,
		unitOfMeasureSchema,
		type UnitOfMeasure
	} from '$features/inventory/schemas';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = createInventoryItemMutation();

	const form = useForm(
		createInventoryItemSchema,
		{
			sku: '',
			name: '',
			description: '',
			category: '',
			unit_of_measure: 'each' as UnitOfMeasure,
			unit_price: 0,
			currency: 'USD',
			cost_price: undefined,
			current_stock: 0,
			reorder_point: 0,
			reorder_quantity: 0,
			supplier_name: '',
			barcode: '',
			tags: []
		},
		{ validateOn: 'blur' }
	);

	const UOM_OPTIONS: SelectOption[] = unitOfMeasureSchema.options.map((o) => ({
		value: o,
		label: o
	}));

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			// Strip empty strings to undefined so the API doesn't reject empty optional fields.
			const cleaned: typeof values = { ...values };
			for (const key of ['description', 'category', 'supplier_name', 'barcode'] as const) {
				if (cleaned[key] === '') cleaned[key] = undefined;
			}
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(cleaned, {
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
				<h2 class="h4">Create item</h2>
				<p class="caption text-fg-muted">Add a new SKU to the catalog.</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			<form
				id="create-inventory-item-form"
				class="stack stack-relaxed"
				onsubmit={onSubmit}
				novalidate
			>
				<div class="grid gap-3 sm:grid-cols-2">
					<TextField
						label="SKU"
						name="sku"
						placeholder="e.g. WIDGET-001"
						bind:value={form.values.sku}
						required
						maxlength={64}
						error={form.errors.sku}
						onblur={() => form.validateField('sku')}
						hint="Uppercase letters, digits, hyphens, or underscores"
					/>
					<TextField
						label="Name"
						name="name"
						placeholder="Display name"
						bind:value={form.values.name}
						required
						maxlength={200}
						error={form.errors.name}
						onblur={() => form.validateField('name')}
					/>
				</div>

				<label class="stack stack-tight">
					<span class="label">Description</span>
					<textarea
						bind:value={form.values.description}
						maxlength={4000}
						rows={3}
						class="glass-input w-full rounded-md px-3 py-2 text-sm"
					></textarea>
				</label>

				<div class="grid gap-3 sm:grid-cols-2">
					<TextField
						label="Category"
						name="category"
						bind:value={form.values.category}
						maxlength={100}
					/>
					<Select
						label="Unit of measure"
						name="unit_of_measure"
						options={UOM_OPTIONS}
						bind:value={form.values.unit_of_measure}
						error={form.errors.unit_of_measure}
					/>
				</div>

				<div class="grid gap-3 sm:grid-cols-3">
					<label class="stack stack-tight">
						<span class="label">Unit price</span>
						<input
							type="number"
							name="unit_price"
							bind:value={form.values.unit_price}
							min={0}
							step={0.01}
							class="glass-input rounded-md px-3 py-2 text-sm"
						/>
						{#if form.errors.unit_price}
							<span class="caption text-danger-700">{form.errors.unit_price}</span>
						{/if}
					</label>
					<TextField
						label="Currency"
						name="currency"
						placeholder="USD"
						bind:value={form.values.currency}
						maxlength={3}
						error={form.errors.currency}
						onblur={() => form.validateField('currency')}
					/>
					<label class="stack stack-tight">
						<span class="label">Cost price (optional)</span>
						<input
							type="number"
							name="cost_price"
							bind:value={form.values.cost_price}
							min={0}
							step={0.01}
							class="glass-input rounded-md px-3 py-2 text-sm"
						/>
					</label>
				</div>

				<div class="grid gap-3 sm:grid-cols-3">
					<label class="stack stack-tight">
						<span class="label">Current stock</span>
						<input
							type="number"
							name="current_stock"
							bind:value={form.values.current_stock}
							min={0}
							class="glass-input rounded-md px-3 py-2 text-sm"
						/>
					</label>
					<label class="stack stack-tight">
						<span class="label">Reorder point</span>
						<input
							type="number"
							name="reorder_point"
							bind:value={form.values.reorder_point}
							min={0}
							class="glass-input rounded-md px-3 py-2 text-sm"
						/>
					</label>
					<label class="stack stack-tight">
						<span class="label">Reorder quantity</span>
						<input
							type="number"
							name="reorder_quantity"
							bind:value={form.values.reorder_quantity}
							min={0}
							class="glass-input rounded-md px-3 py-2 text-sm"
						/>
					</label>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<TextField
						label="Supplier"
						name="supplier_name"
						bind:value={form.values.supplier_name}
						maxlength={200}
					/>
					<TextField
						label="Barcode"
						name="barcode"
						bind:value={form.values.barcode}
						maxlength={64}
					/>
				</div>

				{#if form.bannerError}<Alert variant="danger">{form.bannerError}</Alert>{/if}
			</form>
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="create-inventory-item-form" loading={form.isSubmitting}>
				Create item
			</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
