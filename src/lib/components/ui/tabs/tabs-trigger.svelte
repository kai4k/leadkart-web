<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let { ref = $bindable(null), class: className, ...rest }: TabsPrimitive.TriggerProps = $props();
</script>

<TabsPrimitive.Trigger
	bind:ref
	data-slot="tabs-trigger"
	class={cn(
		'inline-flex h-8 items-center justify-center rounded-sm px-3 text-sm font-medium',
		'data-[state=active]:bg-bg-elevated data-[state=active]:text-fg data-[state=active]:shadow-sm',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
		'disabled:pointer-events-none disabled:opacity-50',
		className
	)}
	{...rest}
/>
