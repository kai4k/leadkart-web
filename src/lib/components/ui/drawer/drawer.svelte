<script lang="ts">
	/**
	 * `busy`: a save is in flight, so Escape, outside click, drag and every Close are refused (vaul's
	 * `dismissible`, which vetoes at the root). The failure then lands where the user can see it.
	 */
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	let {
		shouldScaleBackground = true,
		direction = 'right',
		open = $bindable(false),
		activeSnapPoint = $bindable(null),
		dismissible = true,
		busy = false,
		...rest
	}: DrawerPrimitive.RootProps & { busy?: boolean } = $props();
</script>

<DrawerPrimitive.Root
	{shouldScaleBackground}
	{direction}
	dismissible={dismissible && !busy}
	bind:open
	bind:activeSnapPoint
	{...rest}
/>
