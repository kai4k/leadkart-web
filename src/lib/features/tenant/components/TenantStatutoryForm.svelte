<script lang="ts">
	import { isApiError } from '$api/client';
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';
	import { updateTenantStatutorySchema } from '../schemas';
	import { tenant as tenantStore } from '../stores/tenant.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantStatutoryForm — edits the Indian compliance triple
	 * (GSTIN + PAN + drug licence number). The leadkart-go aggregate
	 * accepts empty strings as "clear this declaration" so partially-
	 * onboarded tenants can stage values one at a time.
	 *
	 * Pattern mirrors TenantProfileForm — see that component for the
	 * detailed per-field rationale (Zod source-of-truth validation,
	 * $effect.pre re-sync, errorRegion focus-shift on submit failure).
	 *
	 * Format-level validation (GSTIN 15-char regex, PAN 10-char regex)
	 * is intentionally NOT added here. The server's Statutory value-
	 * object enforces the canonical format + returns 422 with the
	 * exact rejection reason; client-side regex would only duplicate
	 * the rule and risk drift. UX impact is negligible — the user
	 * pastes a known value, server confirms or surfaces the precise
	 * error.
	 */

	interface Props {
		tenant: Tenant;
	}

	let { tenant }: Props = $props();

	let gst = $state('');
	let pan = $state('');
	let drugLicence = $state('');
	let saving = $state(false);
	let formError = $state<string | null>(null);
	let success = $state(false);
	let errorRegion: HTMLElement | undefined = $state();

	$effect.pre(() => {
		gst = tenant.gst_number ?? '';
		pan = tenant.pan_number ?? '';
		drugLicence = tenant.drug_licence_number ?? '';
	});

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		success = false;

		const parsed = updateTenantStatutorySchema.safeParse({
			gst_number: gst.trim(),
			pan_number: pan.trim(),
			drug_licence_number: drugLicence.trim()
		});
		if (!parsed.success) {
			formError = 'Some values were rejected. Please check the highlighted fields.';
			return;
		}

		saving = true;
		try {
			await tenantStore.updateStatutory(parsed.data);
			success = true;
		} catch (err) {
			formError =
				isApiError(err) && err.status === 422
					? err.message || 'The values entered were rejected by the server.'
					: 'Could not save changes. Please try again.';
			queueMicrotask(() => errorRegion?.focus());
		} finally {
			saving = false;
		}
	}
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
	{:else if success}
		<Alert variant="success">Statutory details updated.</Alert>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={saving}>Save changes</Button>
	</div>
</form>
