<script lang="ts">
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';
	import { updateTenantStatutorySchema } from '../schemas';
	import { updateTenantStatutoryMutation } from '../queries';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantStatutoryForm — edits the Indian compliance triple
	 * (GSTIN + PAN + drug licence number). The leadkart-go aggregate
	 * accepts empty strings as "clear this declaration" so partially-
	 * onboarded tenants can stage values one at a time.
	 */

	interface Props {
		tenant: Tenant;
		tenantId: string;
	}

	let { tenant, tenantId }: Props = $props();

	const mutation = $derived(updateTenantStatutoryMutation(tenantId));

	const form = useForm(updateTenantStatutorySchema, {
		gst_number: '',
		pan_number: '',
		drug_licence_number: ''
	});

	$effect.pre(() => {
		form.values.gst_number = tenant.gst_number ?? '';
		form.values.pan_number = tenant.pan_number ?? '';
		form.values.drug_licence_number = tenant.drug_licence_number ?? '';
	});

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(values, {
					onSuccess: () => resolve(),
					onError: (err) => reject(err)
				});
			});
		});
	}
</script>

<form class="stack" onsubmit={onSubmit} novalidate>
	<TextField
		label="GSTIN"
		hint="15-character GSTIN (e.g. 27AAAPL1234C1Z1). Leave blank if not registered."
		autocomplete="off"
		spellcheck={false}
		bind:value={form.values.gst_number}
		error={form.errors.gst_number}
	/>

	<TextField
		label="PAN"
		hint="10-character permanent account number (e.g. AAAPL1234C)."
		autocomplete="off"
		spellcheck={false}
		bind:value={form.values.pan_number}
		error={form.errors.pan_number}
	/>

	<TextField
		label="Drug licence number"
		hint="Issued by the State Drug Controller — required for retail / wholesale pharma operations."
		autocomplete="off"
		spellcheck={false}
		bind:value={form.values.drug_licence_number}
		error={form.errors.drug_licence_number}
	/>

	{#if form.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={form.isSubmitting}>Save changes</Button>
	</div>
</form>
