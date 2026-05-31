<script lang="ts">
	import { ContextMenu as ContextMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		...rest
	}: ContextMenuPrimitive.ContentProps = $props();
</script>

<ContextMenuPrimitive.Portal>
	<ContextMenuPrimitive.Content
		bind:ref
		data-slot="context-menu-content"
		class={cn(
			'bg-bg-elevated border border-border rounded-md shadow-md z-50 min-w-[8rem] overflow-hidden rounded-md p-1 text-fg shadow-md',
			'data-[state=open]:animate-in data-[state=closed]:animate-out',
			className
		)}
		{...rest}
	/>
</ContextMenuPrimitive.Portal>
