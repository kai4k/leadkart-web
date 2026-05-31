<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import { Search, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(''),
		...rest
	}: CommandPrimitive.InputProps = $props();
</script>

<div data-slot="command-input-wrapper" class="flex items-center border-b border-border px-3">
	<Icon icon={Search} size="sm" class="me-2 opacity-50" />
	<CommandPrimitive.Input
		bind:ref
		bind:value
		data-slot="command-input"
		class={cn(
			'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none',
			'placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{...rest}
	/>
</div>
