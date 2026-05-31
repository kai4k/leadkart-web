<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: NavigationMenuPrimitive.RootProps = $props();
</script>

<NavigationMenuPrimitive.Root
	bind:ref
	data-slot="navigation-menu"
	class={cn('relative z-10 flex max-w-max flex-1 items-center justify-center', className)}
	{...rest}
>
	{@render children?.()}
</NavigationMenuPrimitive.Root>
