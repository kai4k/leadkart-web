<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';
	import type { Tenant } from '../types';

	/**
	 * TenantStatutoryForm — edits GSTIN + PAN + drug licence number
	 * via SvelteKit form action on /settings/tenant/statutory.
	 */
	type FormResult = {
		values?: { gst_number: string; pan_number: string; drug_licence_number: string };
		errors?: Record<string, string | string[] | undefined>;
		bannerError?: string;
		success?: boolean;
	};
	type Props = { tenant: Tenant; form?: FormResult };
	let { tenant, form }: Props = $props();

	let loading = $state(false);

	function err(field: string): string | undefined {
		const v = form?.errors?.[field];
		if (typeof v === 'string') return v;
		if (Array.isArray(v)) return v[0];
		return undefined;
	}

	const values = $derived(
		form?.values ?? {
			gst_number: tenant.gst_number ?? '',
			pan_number: tenant.pan_number ?? '',
			drug_licence_number: tenant.drug_licence_number ?? ''
		}
	);
</script>

<form
	class="stack"
	method="POST"
	novalidate
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			await update();
			loading = false;
		};
	}}
>
	<TextField
		label="GSTIN"
		name="gst_number"
		hint="15-character GSTIN (e.g. 27AAAPL1234C1Z1). Leave blank if not registered."
		autocomplete="off"
		spellcheck={false}
		value={values.gst_number}
		error={err('gst_number')}
	/>

	<TextField
		label="PAN"
		name="pan_number"
		hint="10-character permanent account number (e.g. AAAPL1234C)."
		autocomplete="off"
		spellcheck={false}
		value={values.pan_number}
		error={err('pan_number')}
	/>

	<TextField
		label="Drug licence number"
		name="drug_licence_number"
		hint="Issued by the State Drug Controller — required for retail / wholesale pharma operations."
		autocomplete="off"
		spellcheck={false}
		value={values.drug_licence_number}
		error={err('drug_licence_number')}
	/>

	{#if form?.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{:else if form?.success}
		<Alert variant="success">Statutory IDs saved.</Alert>
	{/if}

	<div class="form-footer">
		<Button type="submit" {loading}>Save changes</Button>
	</div>
</form>
