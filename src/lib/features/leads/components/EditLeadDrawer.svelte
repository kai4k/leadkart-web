<script lang="ts">
	/**
	 * EditLeadDrawer — edit the BRD-§5 editable subset of a CrmLead.
	 *
	 * Identity fields (contact_name, mobile_number, pin_code, city,
	 * district, state) are LOCKED — the server returns 422 if they're
	 * present in the PATCH body, so we don't surface them here. Only
	 * editable fields are bound to the form.
	 */
	import { Drawer, Button, Alert } from '$ui';
	import { Select, Switch, TagInput, TextField } from '$form';
	import { Icon, X } from '$icons';
	import { updateLeadSchema, type CrmLeadDto } from '../schemas';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { updateLeadMutation } from '../queries';
	import {
		BUY_TIMELINE_LABEL,
		ORDER_VALUE_BAND_LABEL,
		STAGE_META,
		TEMPERATURE_META
	} from '../view-models';
	import type { BuyTimeline, OrderValueBand, LeadStage, LeadTemperature } from '../schemas';

	type Props = {
		lead: CrmLeadDto | null;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};

	let { lead, open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = updateLeadMutation();
	const form = useForm(
		updateLeadSchema,
		{
			stage: 'new' as LeadStage,
			temperature: 'warm' as LeadTemperature,
			notes: '',
			email: '',
			street: '',
			has_drug_licence: false,
			has_gst: false,
			gst_number: '',
			has_pan: false,
			pan_number: '',
			product_ranges: [] as string[],
			dosage_forms: [] as string[],
			order_value_band: 'below_5000' as OrderValueBand,
			buy_timeline: 'within_month' as BuyTimeline
		},
		{ validateOn: 'blur' }
	);

	// Local mirrors for the array fields — TagInput requires a concrete
	// `string[]`, but `updateLeadSchema.partial()` makes the form fields
	// `string[] | undefined`. Mirror them locally and copy back on submit.
	let productRanges: string[] = $state([]);
	let dosageForms: string[] = $state([]);

	// When the lead prop changes (or drawer opens) seed the form values.
	$effect(() => {
		if (!lead || !open) return;
		form.values = {
			stage: lead.stage,
			temperature: lead.temperature,
			notes: lead.notes ?? '',
			email: lead.email ?? '',
			street: lead.address.street ?? '',
			has_drug_licence: lead.has_drug_licence,
			has_gst: lead.has_gst,
			gst_number: lead.gst_number ?? '',
			has_pan: lead.has_pan,
			pan_number: lead.pan_number ?? '',
			product_ranges: lead.product_ranges,
			dosage_forms: lead.dosage_forms,
			order_value_band: lead.order_value_band,
			buy_timeline: lead.buy_timeline
		};
		productRanges = [...lead.product_ranges];
		dosageForms = [...lead.dosage_forms];
		form.clearErrors();
	});

	const stageOptions = STAGE_META.map((s) => ({ value: s.value, label: s.label }));
	const temperatureOptions = TEMPERATURE_META.map((t) => ({ value: t.value, label: t.label }));
	const orderValueOptions = (Object.keys(ORDER_VALUE_BAND_LABEL) as OrderValueBand[]).map((k) => ({
		value: k,
		label: ORDER_VALUE_BAND_LABEL[k]
	}));
	const buyTimelineOptions = (Object.keys(BUY_TIMELINE_LABEL) as BuyTimeline[]).map((k) => ({
		value: k,
		label: BUY_TIMELINE_LABEL[k]
	}));

	async function onSubmit(e: SubmitEvent) {
		if (!lead) return;
		const leadId = lead.id;
		// Sync the local tag-array mirrors back into the form values
		// before validation runs.
		form.values.product_ranges = productRanges;
		form.values.dosage_forms = dosageForms;
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(
					{ id: leadId, req: values },
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
				<h2 class="h4">Edit lead</h2>
				<p class="caption text-fg-muted">
					Contact, mobile number, and pin/city/state are locked at lead-purchase time.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close">
					<Icon icon={X} size="sm" />
				</button>
			</Drawer.Close>
		</Drawer.Header>

		<Drawer.Body>
			<form id="edit-lead-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Select
						label="Stage"
						name="stage"
						bind:value={form.values.stage}
						options={stageOptions}
					/>
					<Select
						label="Temperature"
						name="temperature"
						bind:value={form.values.temperature}
						options={temperatureOptions}
					/>
					<Select
						label="Order value band"
						bind:value={form.values.order_value_band}
						options={orderValueOptions}
					/>
					<Select
						label="Buy timeline"
						bind:value={form.values.buy_timeline}
						options={buyTimelineOptions}
					/>
				</div>

				<TextField
					label="Email"
					name="email"
					bind:value={form.values.email}
					placeholder="contact@example.in"
					error={form.errors.email}
					onblur={() => form.validateField('email')}
				/>

				<TextField
					label="Street (in address)"
					name="street"
					bind:value={form.values.street}
					placeholder="Shop 12, Main Bazar"
				/>

				<TagInput
					label="Product ranges"
					value={productRanges}
					placeholder="Antibiotics, Pediatric…"
				/>
				<TagInput label="Dosage forms" value={dosageForms} placeholder="Tablet, Syrup…" />

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Switch label="Has drug licence" bind:checked={form.values.has_drug_licence} />
					<Switch label="Has GST" bind:checked={form.values.has_gst} />
				</div>

				{#if form.values.has_gst}
					<TextField
						label="GSTIN"
						name="gst_number"
						bind:value={form.values.gst_number}
						placeholder="22AAAAA0000A1Z5"
						error={form.errors.gst_number}
						onblur={() => form.validateField('gst_number')}
					/>
				{/if}

				<Switch label="Has PAN" bind:checked={form.values.has_pan} />
				{#if form.values.has_pan}
					<TextField
						label="PAN"
						name="pan_number"
						bind:value={form.values.pan_number}
						placeholder="AAAAA9999A"
						error={form.errors.pan_number}
						onblur={() => form.validateField('pan_number')}
					/>
				{/if}

				<label class="stack stack-tight">
					<span class="label">Notes</span>
					<textarea
						name="notes"
						bind:value={form.values.notes}
						rows={4}
						maxlength={4000}
						class="bg-bg-elevated border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
					></textarea>
				</label>

				{#if form.bannerError}<Alert variant="danger">{form.bannerError}</Alert>{/if}
			</form>
		</Drawer.Body>

		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="edit-lead-form" loading={form.isSubmitting}>Save changes</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
