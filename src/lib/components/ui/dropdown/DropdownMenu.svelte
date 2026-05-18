<!-- src/lib/components/ui/dropdown/DropdownMenu.svelte -->
<!--
	DropdownMenu — styled Content + Portal wrapper.

	Wraps bits-ui DropdownMenu.Content inside its Portal with Liquid Glass
	material styling. Uses --z-dropdown (1000) for stacking order.

	bits-ui supplies data-[state=open/closed] on the content element —
	animation classes hook into that for enter/exit transitions.
-->
<script lang="ts">
	import { DropdownMenu as BitsMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
		children: Snippet;
	};

	let { class: className = '', align = 'start', sideOffset = 6, children }: Props = $props();
</script>

<BitsMenu.Portal>
	<BitsMenu.Content
		{align}
		{sideOffset}
		class={cn(
			'glass-card',
			'min-w-[10rem] rounded-xl p-1',
			'border border-[var(--glass-border-subtle)]',
			'shadow-[var(--glass-shadow-sm)]',
			'data-[state=open]:animate-pop-in data-[state=closed]:animate-fade-out',
			className
		)}
		style="z-index: var(--z-dropdown);"
	>
		{@render children()}
	</BitsMenu.Content>
</BitsMenu.Portal>
