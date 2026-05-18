<script lang="ts">
	import { Tooltip as BitsTooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		class: className = '',
		children,
		...rest
	}: { class?: string; children: Snippet } = $props();
</script>

<BitsTooltip.Trigger class={className} {...rest}>{@render children()}</BitsTooltip.Trigger>
