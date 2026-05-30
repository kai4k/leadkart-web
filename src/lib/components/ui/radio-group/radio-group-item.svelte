<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		...rest
	}: RadioGroupPrimitive.ItemProps = $props();
</script>

<RadioGroupPrimitive.Item
	bind:ref
	data-slot="radio-group-item"
	class={cn(
		'aspect-square h-4 w-4 rounded-full border border-border text-primary ring-offset-bg',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'data-[state=checked]:border-primary',
		className
	)}
	{...rest}
>
	{#snippet children({ checked })}
		{#if checked}
			<div class="flex items-center justify-center">
				<div class="h-2 w-2 rounded-full bg-primary"></div>
			</div>
		{/if}
	{/snippet}
</RadioGroupPrimitive.Item>
