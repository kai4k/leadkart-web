<script lang="ts">
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';
	import { Check, Minus, Icon } from '$icons';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		checked = $bindable(false),
		indeterminate = $bindable(false),
		...rest
	}: CheckboxPrimitive.RootProps = $props();
</script>

<CheckboxPrimitive.Root
	bind:ref
	bind:checked
	bind:indeterminate
	data-slot="checkbox"
	class={cn(
		'peer h-4 w-4 shrink-0 rounded-sm border border-border ring-offset-bg',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'data-[state=checked]:bg-primary data-[state=checked]:text-primary-fg data-[state=checked]:border-primary',
		className
	)}
	{...rest}
>
	{#snippet children({ checked: c, indeterminate: i })}
		<div class="flex items-center justify-center">
			{#if i}
				<Icon icon={Minus} size="xs" class="text-current" />
			{:else if c}
				<Icon icon={Check} size="xs" class="text-current" />
			{/if}
		</div>
	{/snippet}
</CheckboxPrimitive.Root>
