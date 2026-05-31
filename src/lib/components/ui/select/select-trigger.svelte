<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { ChevronDown, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: SelectPrimitive.TriggerProps = $props();
</script>

<SelectPrimitive.Trigger
	bind:ref
	data-slot="select-trigger"
	class={cn(
		'flex h-10 w-full items-center justify-between rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...rest}
>
	{@render children?.()}
	<Icon icon={ChevronDown} size="sm" class="opacity-50" />
</SelectPrimitive.Trigger>
