<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CommandPrimitive.LinkItemProps = $props();
</script>

<CommandPrimitive.LinkItem
	bind:ref
	data-slot="command-item"
	class={cn(
		"item-highlight data-selected:bg-muted data-selected:text-foreground data-selected:*:[svg]:text-foreground relative flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-solid forced-colors:data-selected:outline-2 forced-colors:data-selected:outline-solid select-none in-data-[slot=dialog-content]:rounded-lg! [&_svg:not([class*='size-'])]:size-4 group/command-item [&_svg]:pointer-events-none [&_svg]:shrink-0",
		'data-disabled:pointer-events-none data-disabled:opacity-50',
		className
	)}
	{...restProps}
/>
