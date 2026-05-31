<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from 'bits-ui';
	import { ChevronDown, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: NavigationMenuPrimitive.TriggerProps = $props();
</script>

<NavigationMenuPrimitive.Trigger
	bind:ref
	data-slot="navigation-menu-trigger"
	class={cn(
		'group inline-flex h-9 w-max items-center justify-center rounded-md bg-bg-elevated px-3 py-2 text-sm font-medium',
		'hover:bg-bg-muted hover:text-fg focus:bg-bg-muted focus:text-fg',
		'data-[state=open]:bg-bg-muted',
		className
	)}
	{...rest}
>
	{@render children?.()}
	<Icon
		icon={ChevronDown}
		size="xs"
		class="relative ms-1 transition-transform duration-200 group-data-[state=open]:rotate-180"
	/>
</NavigationMenuPrimitive.Trigger>
