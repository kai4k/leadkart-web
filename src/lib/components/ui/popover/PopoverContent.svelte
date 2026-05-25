<!-- src/lib/components/ui/popover/PopoverContent.svelte -->
<!--
	PopoverContent — Floating-UI positioned popover panel.

	Wraps bits-ui Popover.Content inside its Portal with the canonical
	glass-card material. Default `sideOffset=8` per CLAUDE.md spec.

	Inherits the same animation hooks as Dropdown — pop-in on open,
	fade-out on close.
-->
<script lang="ts">
	import { Popover as BitsPopover } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		side?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
		children: Snippet;
	};

	let {
		class: className = '',
		side = 'bottom',
		align = 'center',
		sideOffset = 8,
		children
	}: Props = $props();
</script>

<BitsPopover.Portal>
	<BitsPopover.Content
		{side}
		{align}
		{sideOffset}
		class={cn(
			'glass-card z-popover',
			'min-w-[14rem] rounded-xl p-3',
			'border border-[var(--glass-border-subtle)]',
			'shadow-[var(--glass-shadow-sm)]',
			'data-[state=open]:animate-pop-in data-[state=closed]:animate-fade-out',
			className
		)}
	>
		{@render children()}
	</BitsPopover.Content>
</BitsPopover.Portal>
