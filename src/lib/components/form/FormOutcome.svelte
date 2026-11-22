<script lang="ts">
	import { Alert } from '#lib/components/ui/alert/index.ts';

	/**
	 * The ONE outcome line of a form, whichever way it was submitted (`FormSurfaceForm` for a client
	 * mutation, `ActionForm` for a server form action):
	 *
	 *   - `error` is a destructive Alert (`role="alert"`, announced when it appears, and the place focus
	 *     goes after a failed submit that marked no field invalid);
	 *   - `success` is a polite status. The live region is in the page before its text (a region inserted
	 *     together with its text is often not announced), so the Alert inside it carries no role of its own
	 *     and the line is read once. Pass `success` (even as `null`) to get the region; omit it when the
	 *     form has no success line (a surface that closes instead).
	 *
	 * An error wins: a failed result never shows a success line next to it.
	 */
	let { error, success }: { error?: string | null; success?: string | null } = $props();
</script>

{#if error}<Alert variant="destructive">{error}</Alert>{/if}
{#if success !== undefined}
	<div role="status">
		{#if !error && success}<Alert variant="success" role="none">{success}</Alert>{/if}
	</div>
{/if}
