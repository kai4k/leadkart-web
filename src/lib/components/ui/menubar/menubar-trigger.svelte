<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		...rest
	}: MenubarPrimitive.TriggerProps = $props();
</script>

<MenubarPrimitive.Trigger
	bind:ref
	data-slot="menubar-trigger"
	class={cn(
		'flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none',
		'data-[state=open]:bg-bg-muted data-[state=open]:text-fg',
		'focus-visible:bg-bg-muted focus-visible:text-fg',
		className
	)}
	{...rest}
/>
