<script lang="ts">
	import { isApiError } from '$api/client';
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';
	import { updateTenantProfileSchema } from '../schemas';
	import { tenant as tenantStore } from '../stores/tenant.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantProfileForm — edits legal_name + display_name and submits
	 * via the tenant store (PATCH /profile + reload). Mirrors the
	 * pattern of features/auth/components/SigninForm.svelte:
	 *
	 *   • bind:value + onsubmit handler
	 *   • Zod source-of-truth validates pre-submit
	 *   • aria-busy via Button loading prop
	 *   • errorRegion focus-shift on submission failure (a11y)
	 *
	 * Local state re-syncs to the prop when the parent passes a new
	 * tenant snapshot (e.g. after the post-PATCH reload returns
	 * server-canonicalised values that differ from the typed input).
	 */

	interface Props {
		tenant: Tenant;
	}

	let { tenant }: Props = $props();

	let legalName = $state('');
	let displayName = $state('');
	let saving = $state(false);
	let formError = $state<string | null>(null);
	let success = $state(false);
	let fieldErrors = $state<{ legal_name?: string; display_name?: string }>({});
	let errorRegion: HTMLElement | undefined = $state();

	// Initial-and-re-sync from the prop. $effect.pre runs before the
	// first DOM update so the form never flashes empty. Re-runs when
	// the parent passes a refreshed tenant snapshot — e.g. after
	// updateProfile() reloads and the server canonicalised values
	// would otherwise appear "lost" against what the user typed.
	$effect.pre(() => {
		legalName = tenant.legal_name;
		displayName = tenant.display_name;
	});

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		fieldErrors = {};
		success = false;

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

		saving = true;
		try {
			await tenantStore.updateProfile(parsed.data);
			success = true;
		} catch (err) {
			// 422 — domain rule rejected the values (over-length, etc).
			// Surface the server's message; callers can act on it.
			// Anything else is opaque — generic retry copy.
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
	{:else if success}
		<Alert variant="success">Profile updated.</Alert>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={saving}>Save changes</Button>
	</div>
</form>
