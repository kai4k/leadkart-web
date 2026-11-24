<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { Check as CheckIcon } from '#lib/icons/index.ts';
	import { cn, type WithoutChild } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		children: childrenProp,
		closeOnSelect = false,
		...restProps
	}: WithoutChild<DropdownMenuPrimitive.RadioItemProps> = $props();
</script>

<DropdownMenuPrimitive.RadioItem
	bind:ref
	{closeOnSelect}
	data-slot="dropdown-menu-radio-item"
	class={cn(
		"item-highlight focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-lg py-1 pe-8 ps-1.5 text-sm font-medium data-inset:ps-7 [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-none forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-solid forced-colors:data-highlighted:outline-2 forced-colors:data-highlighted:outline-solid select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		className
	)}
	{...restProps}
>
	{#snippet children({ checked })}
		<span
			class="absolute end-2 flex items-center justify-center pointer-events-none"
			data-slot="dropdown-menu-radio-item-indicator"
		>
			{#if checked}
				<CheckIcon />
			{/if}
		</span>
		{@render childrenProp?.({ checked })}
	{/snippet}
</DropdownMenuPrimitive.RadioItem>
