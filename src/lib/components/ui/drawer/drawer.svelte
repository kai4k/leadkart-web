<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	let {
		shouldScaleBackground = true,
		direction = 'right',
		open = $bindable(false),
		activeSnapPoint = $bindable(null),
		...rest
	}: DrawerPrimitive.RootProps = $props();
</script>

<DrawerPrimitive.Root
	{shouldScaleBackground}
	{direction}
	bind:open
	bind:activeSnapPoint
	{...rest}
/>
