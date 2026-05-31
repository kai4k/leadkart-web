<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import { cn } from '$lib/utils/cn';
	let { ref = $bindable(null), class: className, ...rest }: DrawerPrimitive.TitleProps = $props();
</script>

<DrawerPrimitive.Title
	bind:ref
	data-slot="drawer-title"
	class={cn('text-lg font-semibold leading-tight text-fg', className)}
	{...rest}
/>
