<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';

	// Default direction overridden to 'right' to preserve LeadKart's legacy
	// side-slide-over UX (CreateUserDrawer, EditProductDrawer, RoleAssignmentDrawer, …).
	// vaul ships 'bottom' by default; consumers pass `direction="bottom"`
	// explicitly when they want the mobile bottom-sheet pattern.
	let {
		shouldScaleBackground = true,
		direction = 'right',
		open = $bindable(false),
		activeSnapPoint = $bindable(null),
		...restProps
	}: DrawerPrimitive.RootProps = $props();
</script>

<DrawerPrimitive.Root
	{shouldScaleBackground}
	{direction}
	bind:open
	bind:activeSnapPoint
	{...restProps}
/>
