<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { session } from '#lib/features/auth/index.ts';
	import {
		ActionForm,
		type ActionFormResult,
		type ActionFormSlot
	} from '#lib/components/form/index.ts';
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
		tidy,
		validate,
		children
	}: {
		section: TenantSectionId;
		result: ActionFormResult | null | undefined;
		successMessage: string;
		relaxed?: boolean;
		/** What the form tidies and checks before it posts (`ActionForm`). */
		tidy?: Record<string, (text: string) => string>;
		validate?: (values: Record<string, string>) => Record<string, string>;
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
	{tidy}
	{validate}
	{children}
/>
