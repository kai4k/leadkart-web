<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField, Select, type SelectOption } from '$form';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { updateInventoryItemMutation } from '$features/inventory/queries';
	import {
		updateInventoryItemSchema,
		unitOfMeasureSchema,
		type InventoryItemDto,
		type UnitOfMeasure
	} from '$features/inventory/schemas';

	type Props = {
		open: boolean;
		item: InventoryItemDto | null;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), item, onOpenChange }: Props = $props();

	const mutation = updateInventoryItemMutation();

	const form = useForm(
		updateInventoryItemSchema,
		{
			sku: '',
			name: '',
			description: '',
			category: '',
			unit_of_measure: 'each' as UnitOfMeasure,
			unit_price: 0,
			currency: 'USD',
			cost_price: undefined,
			reorder_point: 0,
			reorder_quantity: 0,
			supplier_name: '',
			barcode: '',
			tags: []
		},
		{ validateOn: 'blur' }
	);

	// Reset form whenever the parent passes in a new item.
	$effect(() => {
		if (item) {
			form.values = {
				sku: item.sku,
				name: item.name,
				description: item.description ?? '',
				category: item.category ?? '',
				unit_of_measure: item.unit_of_measure,
				unit_price: item.unit_price,
				currency: item.currency,
				cost_price: item.cost_price ?? undefined,
				reorder_point: item.reorder_point,
				reorder_quantity: item.reorder_quantity,
				supplier_name: item.supplier_name ?? '',
				barcode: item.barcode ?? '',
				tags: item.tags ?? []
			};
		}
	});

	const UOM_OPTIONS: SelectOption[] = unitOfMeasureSchema.options.map((o) => ({
		value: o,
		label: o
	}));

	async function onSubmit(e: SubmitEvent) {
		if (!item) return;
		await form.submit(e, async (values) => {
			const cleaned: typeof values = { ...values };
			for (const key of ['description', 'category', 'supplier_name', 'barcode'] as const) {
				if (cleaned[key] === '') cleaned[key] = undefined;
			}
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(
					{ id: item.id, body: cleaned },
					{
						onSuccess: () => {
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
				<h2 class="h4">Edit item</h2>
				{#if item}
					<p class="caption text-fg-muted">
						<code>{item.sku}</code>
					</p>
				{/if}
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			<form
				id="edit-inventory-item-form"
				class="stack stack-relaxed"
				onsubmit={onSubmit}
				novalidate
			>
				<div class="grid gap-3 sm:grid-cols-2">
					<TextField
						label="SKU"
						name="sku"
						bind:value={form.values.sku}
						maxlength={64}
						error={form.errors.sku}
						onblur={() => form.validateField('sku')}
					/>
					<TextField
						label="Name"
						name="name"
						bind:value={form.values.name}
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
						bind:value={form.values.currency}
						maxlength={3}
						error={form.errors.currency}
					/>
					<label class="stack stack-tight">
						<span class="label">Cost price</span>
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

				<div class="grid gap-3 sm:grid-cols-2">
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
			<Button type="submit" form="edit-inventory-item-form" loading={form.isSubmitting}>
				Save changes
			</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
