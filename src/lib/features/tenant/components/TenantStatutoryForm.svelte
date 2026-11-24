<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { TextField, type ActionFormResult } from '#lib/components/form/index.ts';
	import TenantSectionForm from './TenantSectionForm.svelte';
	import type { Tenant } from '../types';
	import { STATUTORY_TIDY, validateStatutory } from '../validate.ts';

	/**
	 * TenantStatutoryForm — edits GSTIN + PAN + drug licence number
	 * via the statutory form action on /settings/tenant/statutory.
	 */
	type Props = { tenant: Tenant; form?: ActionFormResult };
	let { tenant, form }: Props = $props();
</script>

<TenantSectionForm
	section="statutory"
	result={form}
	successMessage={$_('pages.tenant.form.saved.statutory')}
	tidy={STATUTORY_TIDY}
	validate={validateStatutory}
>
	{#snippet children({ fieldError, value })}
		<TextField
			label="GSTIN"
			name="gst_number"
			hint="15-character GSTIN (e.g. 27AAAPL1234C1Z1). Leave blank if not registered."
			format="gstin"
			value={String(value('gst_number') ?? tenant.gst_number ?? '')}
			error={fieldError('gst_number')}
		/>

		<TextField
			label="PAN"
			name="pan_number"
			hint="10-character permanent account number (e.g. AAAPL1234C)."
			format="pan"
			value={String(value('pan_number') ?? tenant.pan_number ?? '')}
			error={fieldError('pan_number')}
		/>

		<TextField
			label="Drug licence number"
			name="drug_licence_number"
			hint="Issued by the State Drug Controller. 8 to 30 capital letters, digits, dashes, slashes or spaces (e.g. KA-W-22B-12345)."
			format="code"
			autocapitalize="characters"
			value={String(value('drug_licence_number') ?? tenant.drug_licence_number ?? '')}
			error={fieldError('drug_licence_number')}
		/>
	{/snippet}
</TenantSectionForm>
