<script lang="ts">
	import { Combobox as ComboboxPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		...rest
	}: ComboboxPrimitive.ContentProps = $props();
</script>

<ComboboxPrimitive.Portal>
	<ComboboxPrimitive.Content
		bind:ref
		data-slot="combobox-content"
		{sideOffset}
		class={cn(
			'bg-bg-elevated border border-border rounded-md shadow-md z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md text-fg shadow-md',
			'data-[state=open]:animate-in data-[state=closed]:animate-out',
			className
		)}
		{...rest}
	/>
</ComboboxPrimitive.Portal>
