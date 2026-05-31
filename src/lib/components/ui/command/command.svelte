<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		...rest
	}: CommandPrimitive.RootProps = $props();
</script>

<CommandPrimitive.Root
	bind:ref
	data-slot="command"
	class={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-bg-elevated text-fg', className)}
	{...rest}
/>
