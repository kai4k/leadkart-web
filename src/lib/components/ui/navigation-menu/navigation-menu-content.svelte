<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		...rest
	}: NavigationMenuPrimitive.ContentProps = $props();
</script>

<NavigationMenuPrimitive.Content
	bind:ref
	data-slot="navigation-menu-content"
	class={cn(
		'absolute start-0 top-0 w-full md:absolute md:w-auto',
		'data-[motion=from-end]:animate-in data-[motion=from-start]:animate-in',
		'data-[motion=to-end]:animate-out data-[motion=to-start]:animate-out',
		className
	)}
	{...rest}
/>
