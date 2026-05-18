<script lang="ts">
	import { ValidationError } from '$api/errors';
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';
	import { updateTenantProfileSchema } from '../schemas';
	import { updateTenantProfileMutation } from '../queries';
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

	let legalName = $state('');
	let displayName = $state('');
	let formError = $state<string | null>(null);
	let fieldErrors = $state<{ legal_name?: string; display_name?: string }>({});
	let errorRegion: HTMLElement | undefined = $state();

	$effect.pre(() => {
		legalName = tenant.legal_name;
		displayName = tenant.display_name;
	});

	const mutation = $derived(updateTenantProfileMutation(tenantId));

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		fieldErrors = {};

		const parsed = updateTenantProfileSchema.safeParse({
			legal_name: legalName,
			display_name: displayName
		});
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			fieldErrors = {
				legal_name: flat.legal_name?.[0],
				display_name: flat.display_name?.[0]
			};
			return;
		}

		mutation.mutate(parsed.data, {
			onError: (err) => {
				if (err instanceof ValidationError) {
					fieldErrors = err.fields as typeof fieldErrors;
				} else {
					formError =
						err instanceof Error ? err.message : 'Could not save changes. Please try again.';
					queueMicrotask(() => errorRegion?.focus());
				}
			}
		});
	}

	const isSaving = $derived(mutation.isPending);
</script>

<form class="stack" onsubmit={onSubmit} novalidate>
	<TextField
		label="Legal name"
		hint="The registered name on the tenant's drug-licence and tax filings."
		required
		bind:value={legalName}
		error={fieldErrors.legal_name}
	/>

	<TextField
		label="Display name"
		hint="The friendly name shown in the topbar and on emailed documents."
		required
		bind:value={displayName}
		error={fieldErrors.display_name}
	/>

	{#if formError}
		<div bind:this={errorRegion} tabindex="-1">
			<Alert variant="danger">{formError}</Alert>
		</div>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={isSaving}>Save changes</Button>
	</div>
</form>
