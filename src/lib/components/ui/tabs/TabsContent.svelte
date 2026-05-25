<!-- src/lib/components/ui/tabs/TabsContent.svelte -->
<!--
	TabsContent — single tab panel.

	bits-ui Tabs.Content auto-renders only when its `value` matches the
	Root's active value. Focus outline + ring tokens picked up by
	focus-visible. The default ring offset uses the elevated surface so
	the ring doesn't blend into the panel bg.
-->
<script lang="ts">
	import { Tabs as BitsTabs } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		value: string;
		class?: string;
		children: Snippet;
	};

	let { value, class: className = '', children }: Props = $props();
</script>

<BitsTabs.Content
	{value}
	class={cn(
		'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
		className
	)}
>
	{@render children()}
</BitsTabs.Content>
