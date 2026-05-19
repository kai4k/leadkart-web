<script lang="ts">
	import { Tooltip as BitsTooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = { children: Snippet; delayDuration?: number };
	let { children, delayDuration = 300 }: Props = $props();
</script>

<BitsTooltip.Provider {delayDuration}>
	<BitsTooltip.Root>{@render children()}</BitsTooltip.Root>
</BitsTooltip.Provider>
