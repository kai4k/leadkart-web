<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
	import { Circle as CircleIcon } from '#lib/icons/index.ts';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<RadioGroupPrimitive.ItemProps> = $props();
</script>

<RadioGroupPrimitive.Item
	bind:ref
	data-slot="radio-group-item"
	class={cn(
		'border-input dark:bg-input-fill data-checked:bg-primary-indicator data-checked:text-primary-indicator-foreground dark:data-checked:bg-primary-indicator data-checked:border-primary-indicator aria-invalid:aria-checked:border-primary-indicator aria-invalid:border-destructive focus-visible:border-ring focus-visible:ring-ring    flex size-4 rounded-full focus-visible:ring-3  group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input group-has-[:focus-visible]/field-label:data-checked:border-primary-indicator group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
>
	{#snippet children({ checked })}
		<div data-slot="radio-group-indicator" class="flex size-4 items-center justify-center">
			{#if checked}
				<CircleIcon
					class="bg-primary-indicator-foreground absolute inset-0 m-auto size-2 rounded-full"
				/>
			{/if}
		</div>
	{/snippet}
</RadioGroupPrimitive.Item>
