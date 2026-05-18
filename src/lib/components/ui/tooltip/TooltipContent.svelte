<script lang="ts">
	import { Tooltip as BitsTooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = { class?: string; side?: 'top' | 'right' | 'bottom' | 'left'; children: Snippet };
	let { class: className = '', side = 'top', children }: Props = $props();
</script>

<BitsTooltip.Portal>
	<BitsTooltip.Content
		{side}
		sideOffset={6}
		class={cn(
			'glass-card is-fixed-overlay--tooltip label-small max-w-xs px-2 py-1 text-xs text-[var(--color-fg)]',
			'animate-fade-in',
			className
		)}
	>
		{@render children()}
	</BitsTooltip.Content>
</BitsTooltip.Portal>
