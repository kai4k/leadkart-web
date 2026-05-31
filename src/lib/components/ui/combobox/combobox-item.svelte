<script lang="ts">
	import { Combobox as ComboboxPrimitive } from 'bits-ui';
	import { Check, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: ComboboxPrimitive.ItemProps = $props();
</script>

<ComboboxPrimitive.Item
	bind:ref
	data-slot="combobox-item"
	class={cn(
		'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none',
		'data-[highlighted]:bg-bg-muted data-[highlighted]:text-fg',
		'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
		className
	)}
	{...rest}
>
	{#snippet children({ selected })}
		{#if selected}
			<span class="absolute end-2 flex h-3.5 w-3.5 items-center justify-center">
				<Icon icon={Check} size="xs" />
			</span>
		{/if}
	{/snippet}
</ComboboxPrimitive.Item>
