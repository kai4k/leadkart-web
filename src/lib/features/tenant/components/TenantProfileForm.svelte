<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { TextField, type ActionFormResult } from '#lib/components/form/index.ts';
	import TenantSectionForm from './TenantSectionForm.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantProfileForm — edits legal_name + display_name via the tenant profile form action.
	 * Pure renderer over tenant + the action's result.
	 */
	type Props = { tenant: Tenant; form?: ActionFormResult };
	let { tenant, form }: Props = $props();
</script>

<TenantSectionForm
	section="profile"
	result={form}
	successMessage={$_('pages.tenant.form.saved.profile')}
>
	{#snippet children({ fieldError, value })}
		<TextField
			label="Legal name"
			name="legal_name"
			hint="The registered name on the tenant's drug-licence and tax filings."
			required
			value={String(value('legal_name') ?? tenant.legal_name)}
			error={fieldError('legal_name')}
		/>

		<TextField
			label="Display name"
			name="display_name"
			hint="The friendly name shown in the topbar and on emailed documents."
			required
			value={String(value('display_name') ?? tenant.display_name)}
			error={fieldError('display_name')}
		/>
	{/snippet}
</TenantSectionForm>
