<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Alert, Button } from '$ui';
	import { session } from '$features/auth';
	import { ScopeContextField } from '$form';
	import { TENANT_SECTION_PERMISSION, type TenantSectionId } from '#lib/config/tenant-sections.ts';

	/**
	 * What every tenant-settings form ends with: the action's outcome (a refusal or Go's answer,
	 * an outage that kept the form, or the success line) and the save row. The button shows when
	 * the caller holds the permission Go's PATCH route for this section needs (the form says
	 * which); otherwise the row says why there is nothing to press. Go (and the form action)
	 * stay the enforcers.
	 */
	type Props = {
		form?: { formErrorKey?: string | null; success?: boolean };
		loading: boolean;
		/** Which section this form saves: the one permission table says what it needs. */
		section: TenantSectionId;
		successMessage: string;
	};
	let { form, loading, section, successMessage }: Props = $props();

	const allowed = $derived(session.can(TENANT_SECTION_PERMISSION[section]));
</script>

<ScopeContextField />

{#if form?.formErrorKey}
	<Alert variant="destructive">{$_(form.formErrorKey)}</Alert>
{/if}
<!-- The live region is in the page before its content, so the confirmation is announced (a region inserted together with its text often is not). -->
<div role="status">
	{#if !form?.formErrorKey && form?.success}
		<Alert variant="success" role="none">{successMessage}</Alert>
	{/if}
</div>

<div class="form-footer">
	{#if allowed}
		<Button type="submit" {loading}>Save changes</Button>
	{:else}
		<p class="caption text-muted-foreground">You don't have permission to change these settings.</p>
	{/if}
</div>
