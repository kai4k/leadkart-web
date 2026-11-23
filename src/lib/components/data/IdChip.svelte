<script lang="ts">
	/**
	 * IdChip — an identifier shown short (its first eight characters, the full value on hover) with a
	 * copy button whose accessible name says what it copies: "Copy tenant ID".
	 */
	import { _ } from 'svelte-i18n';
	import { CopyButton } from '#lib/components/ui/index.ts';

	type Props = {
		value: string;
		/** What the value is, as it reads in "Copy {label}". */
		label: string;
	};
	let { value, label }: Props = $props();

	const short = $derived(value.length > 8 ? value.slice(0, 8) : value);
</script>

<span class="inline-flex items-center gap-1">
	<code class="font-mono text-xs" title={value}>{short}</code>
	<CopyButton {value} label={$_('dataTable.copyId', { values: { label } })} />
</span>
