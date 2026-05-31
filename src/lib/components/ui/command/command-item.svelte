<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		...rest
	}: CommandPrimitive.ItemProps = $props();
</script>

<CommandPrimitive.Item
	bind:ref
	data-slot="command-item"
	class={cn(
		'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
		'data-[selected=true]:bg-bg-muted data-[selected=true]:text-fg',
		'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
		className
	)}
	{...rest}
/>
