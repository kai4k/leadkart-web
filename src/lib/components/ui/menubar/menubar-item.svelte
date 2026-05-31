<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		inset,
		...rest
	}: MenubarPrimitive.ItemProps & { inset?: boolean } = $props();
</script>

<MenubarPrimitive.Item
	bind:ref
	data-slot="menubar-item"
	class={cn(
		'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
		'data-[highlighted]:bg-bg-muted data-[highlighted]:text-fg',
		'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
		inset && 'pl-8',
		className
	)}
	{...rest}
/>
