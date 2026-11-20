<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Alert, Button } from '$ui';
	import { session } from '$features/auth';

	/**
	 * What every tenant-settings form ends with: the action's outcome (a refusal or Go's answer,
	 * an outage that kept the form, or the success line) and the save row. The button shows when
	 * the caller holds the permission Go's PATCH route for this section needs (the form says
	 * which); otherwise the row says why there is nothing to press. Go (and the form action)
	 * stay the enforcers.
	 */
	type Props = {
		form?: { bannerError?: string; formErrorKey?: string; success?: boolean };
		loading: boolean;
		permission: string;
		successMessage: string;
	};
	let { form, loading, permission, successMessage }: Props = $props();

	const allowed = $derived(session.can(permission));
</script>

{#if form?.formErrorKey}
	<Alert variant="danger">{$_(form.formErrorKey)}</Alert>
{:else if form?.bannerError}
	<Alert variant="danger">{form.bannerError}</Alert>
{:else if form?.success}
	<Alert variant="success">{successMessage}</Alert>
{/if}

<div class="form-footer">
	{#if allowed}
		<Button type="submit" {loading}>Save changes</Button>
	{:else}
		<p class="caption text-fg-muted">You don't have permission to change these settings.</p>
	{/if}
</div>
