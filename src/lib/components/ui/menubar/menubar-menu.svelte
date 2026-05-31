<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	let { ...rest }: MenubarPrimitive.MenuProps = $props();
</script>

<MenubarPrimitive.Menu {...rest} />
