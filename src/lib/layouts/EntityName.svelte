<script lang="ts">
	/**
	 * A sentence that contains a company / person name set by someone else ("You are acting in {tenant}").
	 * The name is isolated in `<bdi>` (a bidi control character in it cannot reorder the rest of the
	 * sentence), wraps at any point (an inline-block: `line-clamp` would turn it into a block and break the
	 * sentence apart; the full text stays in `title`).
	 * Rendered as text only, never as markup.
	 */
	import { _ } from 'svelte-i18n';

	type Props = {
		/** an i18n key whose message has one `{tenant}` placeholder */
		messageKey: string;
		name: string;
	};

	let { messageKey, name }: Props = $props();

	// A private-use code point stands in for the name so the message splits around it.
	const SLOT = '';
	const parts = $derived($_(messageKey, { values: { tenant: SLOT } }).split(SLOT));
</script>

{parts[0]}<bdi class="inline-block max-w-full align-bottom break-words" title={name}>{name}</bdi
>{parts.slice(1).join('')}
