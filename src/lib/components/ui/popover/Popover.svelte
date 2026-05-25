<!-- src/lib/components/ui/popover/Popover.svelte -->
<!--
	Popover.Root — bits-ui Popover.Root wrapper.

	bits-ui handles focus management, outside-click dismissal, ESC
	dismissal, and ARIA dialog semantics. The Content child handles
	Floating UI positioning + visual styling.

	Used for: filter popovers, inline info bubbles, mini-forms over a
	trigger.
-->
<script lang="ts">
	import { Popover as BitsPopover } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children: Snippet;
	};

	let { open = $bindable(false), onOpenChange, children }: Props = $props();
</script>

<BitsPopover.Root bind:open {onOpenChange}>
	{@render children()}
</BitsPopover.Root>
