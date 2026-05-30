<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	let { ref = $bindable(null), ...rest }: DrawerPrimitive.TriggerProps = $props();
</script>

<DrawerPrimitive.Trigger bind:ref data-slot="drawer-trigger" {...rest} />
