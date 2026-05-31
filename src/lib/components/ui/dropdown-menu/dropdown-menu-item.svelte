<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		inset,
		variant,
		...rest
	}: DropdownMenuPrimitive.ItemProps & {
		inset?: boolean;
		variant?: 'default' | 'destructive' | 'danger';
	} = $props();
</script>

<DropdownMenuPrimitive.Item
	bind:ref
	data-slot="dropdown-menu-item"
	data-variant={variant}
	class={cn(
		'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
		'data-[highlighted]:bg-bg-muted data-[highlighted]:text-fg',
		'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
		(variant === 'destructive' || variant === 'danger') &&
			'text-danger-700 data-[highlighted]:bg-danger-50 data-[highlighted]:text-danger-900',
		inset && 'pl-8',
		className
	)}
	{...rest}
/>
