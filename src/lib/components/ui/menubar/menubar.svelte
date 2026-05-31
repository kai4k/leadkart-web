<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let { ref = $bindable(null), class: className, ...rest }: MenubarPrimitive.RootProps = $props();
</script>

<MenubarPrimitive.Root
	bind:ref
	data-slot="menubar"
	class={cn(
		'flex h-10 items-center gap-1 rounded-md border border-border bg-bg-elevated p-1',
		className
	)}
	{...rest}
/>
