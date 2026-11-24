<script lang="ts">
	/**
	 * Footer: Domiex markup (a bordered row of fixed height, muted text). It is not fixed: it sits at
	 * the end of the shell's content column (`margin-top: auto` pushes it down on a short page), so it
	 * never overlaps a long one. The row is as wide as the page (`--shell-page-pad-x` / `--shell-content-max`).
	 */
	import { _ } from 'svelte-i18n';

	import { currentYear } from '#lib/utils/format.ts';

	// UTC, not the machine's zone: the server renders this and the browser hydrates it.
	const year = currentYear();
</script>

<div
	class="mx-auto mt-auto w-full max-w-(--shell-content-max) px-(--shell-page-pad-x) print:hidden"
>
	<footer
		class="flex h-(--shell-footer-height) items-center border-t border-border text-sm text-muted-foreground"
		aria-label={$_('shell.footer.label')}
	>
		{$_('shell.footer.copyright', { values: { year } })}
	</footer>
</div>
