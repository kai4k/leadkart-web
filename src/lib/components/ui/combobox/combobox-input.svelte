<script lang="ts">
	import { Combobox as ComboboxPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		...rest
	}: ComboboxPrimitive.InputProps = $props();
</script>

<ComboboxPrimitive.Input
	bind:ref
	data-slot="combobox-input"
	class={cn(
		'flex h-10 w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm',
		'placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...rest}
/>
