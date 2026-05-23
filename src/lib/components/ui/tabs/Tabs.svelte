<!-- src/lib/components/ui/tabs/Tabs.svelte -->
<!--
	Tabs.Root — bits-ui Tabs.Root wrapper.

	bits-ui handles ARIA roles (tablist / tab / tabpanel), focus
	management, and arrow-key navigation. Visual styling lives in the
	List / Trigger children.

	Variant is propagated to triggers via a setContext-free pattern:
	consumers pass `variant` to BOTH Root + List, OR rely on the
	canonical default (underline). For now, variant is consumed by
	List + Trigger directly via prop drilling — keeps the API explicit
	and avoids a context that's only used by one component.
-->
<script lang="ts">
	import { Tabs as BitsTabs } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		value?: string;
		onValueChange?: (value: string) => void;
		orientation?: 'horizontal' | 'vertical';
		loop?: boolean;
		activationMode?: 'manual' | 'automatic';
		disabled?: boolean;
		class?: string;
		children: Snippet;
	};

	let {
		value = $bindable(''),
		onValueChange,
		orientation = 'horizontal',
		loop = false,
		activationMode = 'automatic',
		disabled = false,
		class: className = '',
		children
	}: Props = $props();
</script>

<BitsTabs.Root
	bind:value
	{onValueChange}
	{orientation}
	{loop}
	{activationMode}
	{disabled}
	class={cn('flex flex-col gap-3', className)}
>
	{@render children()}
</BitsTabs.Root>
