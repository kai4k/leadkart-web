<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField, NumberInput, Combobox, RadioGroup, RadioItem } from '$form';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { categoriesQuery, typesQuery, updateProductMutation } from '$features/inventory/queries';
	import {
		createProductRequestSchema,
		type ProductDto,
		type UpdateProductRequest
	} from '$features/inventory/schemas';
	import { DRUG_SCHEDULE_OPTIONS } from '$features/inventory/view-models';
	import { Icon, X } from '$icons';

	/**
	 * EditProductDrawer — partial update of an existing product.
	 * Mirrors CreateProductDrawer field-for-field. Identity fields are
	 * editable per BRD (unlike CRM leads where contact is immutable).
	 */
	type Props = {
		open: boolean;
		product: ProductDto | null;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), product, onOpenChange }: Props = $props();

	const mutation = updateProductMutation();

	type EditValues = {
		brand_name: string;
		generic_name: string;
		composition: string;
		manufacturer_name: string;
		manufacturing_license_no: string;
		product_category: string;
		product_type: string;
		drug_schedule: ProductDto['drug_schedule'];
		pack_size: string;
		pack_type: string;
		units_per_pack: number;
		mrp: number;
		purchase_rate: number;
		sale_rate: number;
		gst_percentage: number;
		hsn_code: string;
		storage_condition: string;
		shelf_life_months: number;
	};

	function valuesFrom(p: ProductDto | null): EditValues {
		if (!p)
			return {
				brand_name: '',
				generic_name: '',
				composition: '',
				manufacturer_name: '',
				manufacturing_license_no: '',
				product_category: '',
				product_type: '',
				drug_schedule: 'otc',
				pack_size: '',
				pack_type: '',
				units_per_pack: 1,
				mrp: 0,
				purchase_rate: 0,
				sale_rate: 0,
				gst_percentage: 0,
				hsn_code: '',
				storage_condition: '',
				shelf_life_months: 1
			};
		return {
			brand_name: p.brand_name,
			generic_name: p.generic_name ?? '',
			composition: p.composition ?? '',
			manufacturer_name: p.manufacturer_name ?? '',
			manufacturing_license_no: p.manufacturing_license_no ?? '',
			product_category: p.product_category,
			product_type: p.product_type,
			drug_schedule: p.drug_schedule,
			pack_size: p.pack_size ?? '',
			pack_type: p.pack_type ?? '',
			units_per_pack: p.units_per_pack ?? 1,
			mrp: p.mrp,
			purchase_rate: p.purchase_rate,
			sale_rate: p.sale_rate,
			gst_percentage: p.gst_percentage,
			hsn_code: p.hsn_code,
			storage_condition: p.storage_condition ?? '',
			shelf_life_months: p.shelf_life_months
		};
	}

	const form = useForm(createProductRequestSchema, valuesFrom(null), { validateOn: 'blur' });

	$effect(() => {
		if (open && product) {
			form.values = valuesFrom(product);
			form.clearErrors();
		}
	});

	const categoriesQ = categoriesQuery();
	const typesQ = typesQuery();
	const categoryOptions = $derived(
		(categoriesQ.data?.items ?? []).map((c) => ({ value: c, label: c }))
	);
	const typeOptions = $derived((typesQ.data?.items ?? []).map((t) => ({ value: t, label: t })));

	async function onSubmit(e: SubmitEvent) {
		if (!product) return;
		await form.submit(e, async (values) => {
			const cleaned: UpdateProductRequest = { ...values };
			for (const key of [
				'generic_name',
				'composition',
				'manufacturer_name',
				'manufacturing_license_no',
				'pack_size',
				'pack_type',
				'storage_condition'
			] as const) {
				const v = cleaned[key];
				if (typeof v === 'string' && v === '') cleaned[key] = undefined;
			}
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(
					{ id: product.id, body: cleaned },
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
				<h2 class="h4">Edit product</h2>
				{#if product}
					<p class="caption text-fg-muted">{product.brand_name}</p>
				{/if}
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close">
					<Icon icon={X} size="sm" />
				</button>
			</Drawer.Close>
		</Drawer.Header>

		<Drawer.Body>
			<form id="edit-product-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<section class="stack stack-tight">
					<h3 class="h6">Classification</h3>
					<Combobox
						label="Product category"
						options={categoryOptions}
						value={form.values.product_category || null}
						onValueChange={(v) => (form.values.product_category = v)}
						placeholder="Pick a therapeutic area"
						error={form.errors.product_category}
					/>
					<Combobox
						label="Product type"
						options={typeOptions}
						value={form.values.product_type || null}
						onValueChange={(v) => (form.values.product_type = v)}
						placeholder="Pick a physical form"
						error={form.errors.product_type}
					/>
					<RadioGroup
						label="Drug schedule"
						bind:value={form.values.drug_schedule}
						orientation="horizontal"
					>
						{#each DRUG_SCHEDULE_OPTIONS as opt (opt.value)}
							<RadioItem value={opt.value} label={opt.label} />
						{/each}
					</RadioGroup>
				</section>

				<section class="stack stack-tight">
					<h3 class="h6">Identity</h3>
					<TextField
						label="Brand name"
						name="brand_name"
						bind:value={form.values.brand_name}
						maxlength={200}
						error={form.errors.brand_name}
					/>
					<TextField
						label="Generic name"
						name="generic_name"
						bind:value={form.values.generic_name}
						maxlength={500}
					/>
					<TextField
						label="Composition"
						name="composition"
						bind:value={form.values.composition}
						maxlength={1000}
					/>
					<TextField
						label="Manufacturer"
						name="manufacturer_name"
						bind:value={form.values.manufacturer_name}
						maxlength={200}
					/>
				</section>

				<section class="stack stack-tight">
					<h3 class="h6">Commercial</h3>
					<div class="grid gap-3 sm:grid-cols-3">
						<NumberInput
							label="MRP"
							bind:value={form.values.mrp}
							min={0}
							step={0.01}
							precision={2}
							prefix="₹"
						/>
						<NumberInput
							label="Sale rate"
							bind:value={form.values.sale_rate}
							min={0}
							step={0.01}
							precision={2}
							prefix="₹"
						/>
						<NumberInput
							label="GST %"
							bind:value={form.values.gst_percentage}
							min={0}
							max={100}
							step={0.5}
							precision={2}
							suffix="%"
						/>
					</div>
					<TextField
						label="HSN code"
						name="hsn_code"
						bind:value={form.values.hsn_code}
						maxlength={8}
						error={form.errors.hsn_code}
					/>
				</section>

				{#if form.bannerError}
					<Alert variant="danger" title="Couldn't update product">{form.bannerError}</Alert>
				{/if}
			</form>
		</Drawer.Body>

		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="edit-product-form" loading={form.isSubmitting}>
				Save changes
			</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
