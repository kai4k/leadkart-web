<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import { cn } from '$lib/utils/cn';
	import DrawerOverlay from './drawer-overlay.svelte';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: DrawerPrimitive.ContentProps = $props();
</script>

<DrawerPrimitive.Portal>
	<DrawerOverlay />
	<DrawerPrimitive.Content
		bind:ref
		data-slot="drawer-content"
		class={cn(
			'bg-bg-elevated border border-border rounded-xl shadow-card fixed z-50 flex h-auto flex-col text-sm',
			'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0',
			'data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh]',
			'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0',
			'data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:sm:max-w-sm',
			'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0',
			'data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:sm:max-w-sm',
			'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0',
			'data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh]',
			className
		)}
		{...rest}
	>
		<div
			class="mx-auto mt-4 hidden h-1 w-[100px] shrink-0 rounded-full bg-bg-muted data-[vaul-drawer-direction=bottom]:block"
		></div>
		{@render children?.()}
	</DrawerPrimitive.Content>
</DrawerPrimitive.Portal>
