<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { session } from '$features/auth';
	import { ActionForm, type ActionFormResult, type ActionFormSlot } from '$form';
	import { TENANT_SECTION_PERMISSION, type TenantSectionId } from '#lib/config/tenant-sections.ts';

	/**
	 * What the five tenant-settings forms share: an `ActionForm` whose button shows when the caller
	 * holds the permission Go's PATCH route for this section needs (the one permission table says
	 * which), whose row says why there is nothing to press otherwise, and which asks before leaving
	 * with unsaved input. Go (and the form action) stay the enforcers.
	 */
	let {
		section,
		result,
		successMessage,
		relaxed = false,
		children
	}: {
		section: TenantSectionId;
		result: ActionFormResult | null | undefined;
		successMessage: string;
		relaxed?: boolean;
		children: Snippet<[ActionFormSlot]>;
	} = $props();
</script>

<ActionForm
	id={`tenant-${section}-form`}
	{result}
	{successMessage}
	{relaxed}
	submitLabel={$_('pages.tenant.form.save')}
	disallowedReason={$_('pages.tenant.form.notAllowed')}
	allowed={session.can(TENANT_SECTION_PERMISSION[section])}
	guardLeave
	{children}
/>
