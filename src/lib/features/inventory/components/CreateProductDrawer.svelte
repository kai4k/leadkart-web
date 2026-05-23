<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField, NumberInput, Combobox, RadioGroup, RadioItem } from '$form';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import {
		categoriesQuery,
		createProductMutation,
		gstDefaultsQuery,
		typesQuery
	} from '$features/inventory/queries';
	import {
		createProductRequestSchema,
		type CreateProductRequest,
		type DrugSchedule
	} from '$features/inventory/schemas';
	import { DRUG_SCHEDULE_OPTIONS } from '$features/inventory/view-models';
	import { Icon, X } from '$icons';

	/**
	 * CreateProductDrawer — long pharma product form. Sections:
	 *   1. Identity (brand, generic, composition, manufacturer)
	 *   2. Classification (category, type, drug schedule) — picks first
	 *      because GST defaults flow off category
	 *   3. Pack (size, type, units per pack)
	 *   4. Commercial (MRP, purchase rate, sale rate, GST%, HSN code)
	 *   5. Regulatory (storage, shelf-life)
	 *
	 * On product_category change: fetch GST default → auto-populate
	 * gst_percentage with "Use category default (X%)" hint.
	 */

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = createProductMutation();

	const initialValues: CreateProductRequest = {
		brand_name: '',
		generic_name: '',
		composition: '',
		manufacturer_name: '',
		manufacturing_license_no: '',
		product_category: '',
		product_type: '',
		drug_schedule: 'otc' as DrugSchedule,
		pack_size: '',
		pack_type: '',
		units_per_pack: 1,
		mrp: 0,
		purchase_rate: 0,
		sale_rate: 0,
		gst_percentage: 12,
		hsn_code: '',
		storage_condition: '',
		shelf_life_months: 24,
		is_active: true
	};

	const form = useForm(createProductRequestSchema, initialValues, { validateOn: 'blur' });

	// ── Reference data ────────────────────────────────────────────────
	const categoriesQ = categoriesQuery();
	const typesQ = typesQuery();
	const gstDefaultsQ = gstDefaultsQuery();

	const categoryOptions = $derived(
		(categoriesQ.data?.items ?? []).map((c) => ({ value: c, label: c }))
	);
	const typeOptions = $derived((typesQ.data?.items ?? []).map((t) => ({ value: t, label: t })));

	const categoryGstDefault = $derived.by(() => {
		const cat = form.values.product_category;
		if (!cat) return null;
		return gstDefaultsQ.data?.defaults[cat] ?? null;
	});

	// On category change, auto-populate GST if it's still at the default.
	let gstAutoFilled = $state(false);
	$effect(() => {
		if (categoryGstDefault != null && !gstAutoFilled) {
			form.values.gst_percentage = categoryGstDefault;
			gstAutoFilled = true;
		}
	});

	function onCategoryChange(value: string) {
		form.values.product_category = value;
		gstAutoFilled = false; // re-arm so the effect fires again
	}

	function onTypeChange(value: string) {
		form.values.product_type = value;
	}

	$effect(() => {
		if (!open) {
			form.reset();
			gstAutoFilled = false;
		}
	});

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			// Strip empty optional strings.
			const cleaned: CreateProductRequest = { ...values };
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
				<h2 class="h4">Create product</h2>
				<p class="caption text-fg-muted">Add a pharma product to the tenant catalog.</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close">
					<Icon icon={X} size="sm" />
				</button>
			</Drawer.Close>
		</Drawer.Header>

		<Drawer.Body>
			<form id="create-product-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<!-- Classification (first because GST defaults flow off category) -->
				<section class="stack stack-tight">
					<h3 class="h6">Classification</h3>
					<Combobox
						label="Product category"
						options={categoryOptions}
						value={form.values.product_category || null}
						onValueChange={onCategoryChange}
						placeholder="Pick a therapeutic area"
						error={form.errors.product_category}
						emptyState="No categories yet — type to add"
						required
					/>
					<Combobox
						label="Product type"
						options={typeOptions}
						value={form.values.product_type || null}
						onValueChange={onTypeChange}
						placeholder="Pick a physical form"
						error={form.errors.product_type}
						emptyState="No types yet — type to add"
						required
					/>
					<RadioGroup
						label="Drug schedule"
						bind:value={form.values.drug_schedule}
						orientation="horizontal"
						error={form.errors.drug_schedule}
					>
						{#each DRUG_SCHEDULE_OPTIONS as opt (opt.value)}
							<RadioItem value={opt.value} label={opt.label} />
						{/each}
					</RadioGroup>
				</section>

				<!-- Identity -->
				<section class="stack stack-tight">
					<h3 class="h6">Identity</h3>
					<TextField
						label="Brand name"
						name="brand_name"
						bind:value={form.values.brand_name}
						required
						maxlength={200}
						error={form.errors.brand_name}
						onblur={() => form.validateField('brand_name')}
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
					<TextField
						label="Manufacturing license no."
						name="manufacturing_license_no"
						bind:value={form.values.manufacturing_license_no}
						maxlength={100}
					/>
				</section>

				<!-- Pack -->
				<section class="stack stack-tight">
					<h3 class="h6">Pack</h3>
					<div class="grid gap-3 sm:grid-cols-3">
						<TextField
							label="Pack size"
							name="pack_size"
							placeholder="10x10"
							bind:value={form.values.pack_size}
							maxlength={50}
						/>
						<TextField
							label="Pack type"
							name="pack_type"
							placeholder="Strip"
							bind:value={form.values.pack_type}
							maxlength={50}
						/>
						<NumberInput
							label="Units per pack"
							bind:value={form.values.units_per_pack}
							min={1}
							step={1}
						/>
					</div>
				</section>

				<!-- Commercial -->
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
							error={form.errors.mrp}
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
						<NumberInput
							label="Sale rate"
							bind:value={form.values.sale_rate}
							min={0}
							step={0.01}
							precision={2}
							prefix="₹"
							error={form.errors.sale_rate}
						/>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<NumberInput
							label="GST %"
							bind:value={form.values.gst_percentage}
							min={0}
							max={100}
							step={0.5}
							precision={2}
							suffix="%"
							hint={categoryGstDefault != null
								? `Category default: ${categoryGstDefault}%`
								: undefined}
							error={form.errors.gst_percentage}
						/>
						<TextField
							label="HSN code"
							name="hsn_code"
							placeholder="30049099"
							bind:value={form.values.hsn_code}
							maxlength={8}
							required
							error={form.errors.hsn_code}
							onblur={() => form.validateField('hsn_code')}
							hint="4–8 digits per GST canonical"
						/>
					</div>
				</section>

				<!-- Regulatory -->
				<section class="stack stack-tight">
					<h3 class="h6">Regulatory</h3>
					<div class="grid gap-3 sm:grid-cols-2">
						<TextField
							label="Storage condition"
							name="storage_condition"
							bind:value={form.values.storage_condition}
							placeholder="Store below 25°C"
							maxlength={200}
						/>
						<NumberInput
							label="Shelf life (months)"
							bind:value={form.values.shelf_life_months}
							min={1}
							step={1}
							error={form.errors.shelf_life_months}
						/>
					</div>
				</section>

				{#if form.bannerError}
					<Alert variant="danger" title="Couldn't create product">{form.bannerError}</Alert>
				{/if}
			</form>
		</Drawer.Body>

		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="create-product-form" loading={form.isSubmitting}>
				Create product
			</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
