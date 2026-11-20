<script lang="ts">
	import { page } from '$app/state';
	import { SCOPE_CONTEXT_FIELD } from '#lib/api/scope-header.ts';
	import { scopeChangedElsewhere } from '#lib/api/operator-scope.ts';

	/** The action keys that say this page is behind the scope cookie, and the reason each leaves for the reloaded page. */
	const CONTEXT_REFUSALS: ReadonlyMap<string, 'context' | 'scope'> = new Map([
		['auth.errors.scopeChanged', 'context'],
		['errors.code.scope_invalid', 'scope']
	]);

	/**
	 * Put inside every form that posts to a scope-sensitive server action. It carries the tenant
	 * context the page was rendered in (the fingerprint from the (app) layout data) as a hidden
	 * field, so the action can refuse a submit made from a page that is behind the scope cookie
	 * (another tab entered or left a context). A plain field, so it works without JavaScript.
	 * When the action refuses for that reason (or because the scope cookie died) the page does a hard
	 * reset through the one foreign-change path (a `replace` of the page's own URL: a native-POST result
	 * page is never re-POSTed): re-running the layout in place would re-bind the typed values to the
	 * new context.
	 */
	const fingerprint = $derived(
		(page.data as { scopeContext?: string } | undefined)?.scopeContext ?? ''
	);
	const refusedAs = $derived(
		CONTEXT_REFUSALS.get(
			(page.form as { formErrorKey?: string | null } | null | undefined)?.formErrorKey ?? ''
		)
	);

	$effect(() => {
		if (refusedAs) scopeChangedElsewhere(undefined, 'refusal', refusedAs);
	});
</script>

<input type="hidden" name={SCOPE_CONTEXT_FIELD} value={fingerprint} />
