<!-- src/lib/components/ui/popover/PopoverTrigger.svelte -->
<!--
	Pass-through trigger — bits-ui forwards the button semantics + ARIA
	state to the underlying element. Wrap a Button or a plain element
	inside this trigger as needed.
-->
<script lang="ts">
	import { Popover as BitsPopover } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	};

	let { class: className = '', children, ...rest }: Props = $props();
</script>

<BitsPopover.Trigger class={className} {...rest}>
	{@render children()}
</BitsPopover.Trigger>
