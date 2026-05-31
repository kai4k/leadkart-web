<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from 'bits-ui';
	let { ref = $bindable(null), ...rest }: NavigationMenuPrimitive.ItemProps = $props();
</script>

<NavigationMenuPrimitive.Item bind:ref data-slot="navigation-menu-item" {...rest} />
