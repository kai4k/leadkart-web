<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	let { ...rest }: DropdownMenuPrimitive.RootProps = $props();
</script>

<DropdownMenuPrimitive.Root {...rest} />
