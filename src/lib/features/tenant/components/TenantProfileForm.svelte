<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';
	import type { Tenant } from '../types';

	/**
	 * TenantProfileForm — edits legal_name + display_name via SvelteKit
	 * form action (default action on /settings/tenant/profile/+page.server.ts).
	 * Pure renderer over tenant + form.
	 */
	type FormResult = {
		values?: { legal_name: string; display_name: string };
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
		form?.values ?? { legal_name: tenant.legal_name, display_name: tenant.display_name }
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
		label="Legal name"
		name="legal_name"
		hint="The registered name on the tenant's drug-licence and tax filings."
		required
		value={values.legal_name}
		error={err('legal_name')}
	/>

	<TextField
		label="Display name"
		name="display_name"
		hint="The friendly name shown in the topbar and on emailed documents."
		required
		value={values.display_name}
		error={err('display_name')}
	/>

	{#if form?.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{:else if form?.success}
		<Alert variant="success">Profile saved.</Alert>
	{/if}

	<div class="form-footer">
		<Button type="submit" {loading}>Save changes</Button>
	</div>
</form>
