<script lang="ts">
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';
	import { updateTenantProfileSchema } from '../schemas';
	import { updateTenantProfileMutation } from '../queries';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantProfileForm — edits legal_name + display_name and submits
	 * via updateTenantProfileMutation. tenantId is threaded from the
	 * parent so this form is pure: it owns no session reads.
	 */

	interface Props {
		tenant: Tenant;
		tenantId: string;
	}

	let { tenant, tenantId }: Props = $props();

	const mutation = $derived(updateTenantProfileMutation(tenantId));

	const form = useForm(updateTenantProfileSchema, {
		legal_name: '',
		display_name: ''
	});

	$effect.pre(() => {
		form.values.legal_name = tenant.legal_name;
		form.values.display_name = tenant.display_name;
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
		label="Legal name"
		hint="The registered name on the tenant's drug-licence and tax filings."
		required
		bind:value={form.values.legal_name}
		error={form.errors.legal_name}
	/>

	<TextField
		label="Display name"
		hint="The friendly name shown in the topbar and on emailed documents."
		required
		bind:value={form.values.display_name}
		error={form.errors.display_name}
	/>

	{#if form.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={form.isSubmitting}>Save changes</Button>
	</div>
</form>
