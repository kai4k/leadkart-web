<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 8,
		...rest
	}: MenubarPrimitive.ContentProps = $props();
</script>

<MenubarPrimitive.Portal>
	<MenubarPrimitive.Content
		bind:ref
		data-slot="menubar-content"
		{sideOffset}
		class={cn(
			'bg-bg-elevated border border-border rounded-md shadow-md z-50 min-w-[12rem] overflow-hidden rounded-md p-1 text-fg shadow-md',
			'data-[state=open]:animate-in data-[state=closed]:animate-out',
			className
		)}
		{...rest}
	/>
</MenubarPrimitive.Portal>
