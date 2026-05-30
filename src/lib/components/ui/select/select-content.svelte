<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		children,
		...rest
	}: SelectPrimitive.ContentProps = $props();
</script>

<SelectPrimitive.Portal>
	<SelectPrimitive.Content
		bind:ref
		data-slot="select-content"
		{sideOffset}
		class={cn(
			'glass-popover relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md text-fg shadow-md',
			'data-[state=open]:animate-in data-[state=closed]:animate-out',
			className
		)}
		{...rest}
	>
		<SelectPrimitive.Viewport class="p-1">
			{@render children?.()}
		</SelectPrimitive.Viewport>
	</SelectPrimitive.Content>
</SelectPrimitive.Portal>
