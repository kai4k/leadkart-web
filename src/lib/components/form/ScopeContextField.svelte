<script lang="ts">
	import { page } from '$app/state';
	import { SCOPE_CONTEXT_FIELD } from '#lib/api/scope-header.ts';
	import { refreshTenantContext } from '#lib/api/operator-scope.ts';

	/**
	 * Put inside every form that posts to a scope-sensitive server action. It carries the tenant
	 * context the page was rendered in (the fingerprint from the (app) layout data) as a hidden
	 * field, so the action can refuse a submit made from a page that is behind the scope cookie
	 * (another tab entered or left a context). A plain field, so it works without JavaScript.
	 * When the action refuses for that reason the layout is re-run and the page catches up.
	 */
	const fingerprint = $derived(
		(page.data as { scopeContext?: string } | undefined)?.scopeContext ?? ''
	);
	const refused = $derived(
		(page.form as { formErrorKey?: string | null } | null | undefined)?.formErrorKey ===
			'auth.errors.scopeChanged'
	);

	$effect(() => {
		if (refused) void refreshTenantContext();
	});
</script>

<input type="hidden" name={SCOPE_CONTEXT_FIELD} value={fingerprint} />
