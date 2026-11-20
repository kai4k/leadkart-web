<script lang="ts">
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
	import { ChevronRight as ChevronRightIcon } from '#lib/icons/index.ts';
	import { buttonVariants, type ButtonVariant } from '#lib/components/ui/button/index.ts';
	import { cn } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		children,
		variant = 'ghost',
		...restProps
	}: RangeCalendarPrimitive.NextButtonProps & {
		variant?: ButtonVariant;
	} = $props();
</script>

{#snippet Fallback()}
	<ChevronRightIcon class={cn('rtl:rotate-180 size-4', className)} />
{/snippet}

<RangeCalendarPrimitive.NextButton
	bind:ref
	class={cn(
		buttonVariants({ variant }),
		'size-(--cell-size) bg-transparent p-0 select-none disabled:opacity-50',
		'rtl:rotate-180',
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		{@render Fallback()}
	{/if}
</RangeCalendarPrimitive.NextButton>
