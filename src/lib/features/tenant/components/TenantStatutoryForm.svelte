<script lang="ts">
	import { ValidationError } from '$api/errors';
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';
	import { updateTenantStatutorySchema } from '../schemas';
	import { updateTenantStatutoryMutation } from '../queries';
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

	let gst = $state('');
	let pan = $state('');
	let drugLicence = $state('');
	let formError = $state<string | null>(null);
	let errorRegion: HTMLElement | undefined = $state();

	$effect.pre(() => {
		gst = tenant.gst_number ?? '';
		pan = tenant.pan_number ?? '';
		drugLicence = tenant.drug_licence_number ?? '';
	});

	const mutation = $derived(updateTenantStatutoryMutation(tenantId));

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;

		const parsed = updateTenantStatutorySchema.safeParse({
			gst_number: gst.trim(),
			pan_number: pan.trim(),
			drug_licence_number: drugLicence.trim()
		});
		if (!parsed.success) {
			formError = 'Some values were rejected. Please check the highlighted fields.';
			return;
		}

		mutation.mutate(parsed.data, {
			onError: (err) => {
				if (err instanceof ValidationError) {
					formError = 'Some values were rejected by the server.';
				} else {
					formError =
						err instanceof Error ? err.message : 'Could not save changes. Please try again.';
				}
				queueMicrotask(() => errorRegion?.focus());
			}
		});
	}

	const isSaving = $derived(mutation.isPending);
</script>

<form class="stack" onsubmit={onSubmit} novalidate>
	<TextField
		label="GSTIN"
		hint="15-character GSTIN (e.g. 27AAAPL1234C1Z1). Leave blank if not registered."
		autocomplete="off"
		spellcheck={false}
		bind:value={gst}
	/>

	<TextField
		label="PAN"
		hint="10-character permanent account number (e.g. AAAPL1234C)."
		autocomplete="off"
		spellcheck={false}
		bind:value={pan}
	/>

	<TextField
		label="Drug licence number"
		hint="Issued by the State Drug Controller — required for retail / wholesale pharma operations."
		autocomplete="off"
		spellcheck={false}
		bind:value={drugLicence}
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
