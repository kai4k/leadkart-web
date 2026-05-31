<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from 'bits-ui';
	let { ref = $bindable(null), ...rest }: NavigationMenuPrimitive.LinkProps = $props();
</script>

<NavigationMenuPrimitive.Link bind:ref data-slot="navigation-menu-link" {...rest} />
