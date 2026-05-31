<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		align = 'center',
		...rest
	}: PopoverPrimitive.ContentProps = $props();
</script>

<PopoverPrimitive.Portal>
	<PopoverPrimitive.Content
		bind:ref
		data-slot="popover-content"
		{sideOffset}
		{align}
		class={cn(
			'bg-bg-elevated border border-border rounded-md shadow-md z-50 w-72 rounded-md p-4 outline-none',
			'data-[state=open]:animate-in data-[state=closed]:animate-out',
			'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
			'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
			'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
			'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
			className
		)}
		{...rest}
	/>
</PopoverPrimitive.Portal>
