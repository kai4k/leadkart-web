<script lang="ts">
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
	import { ChevronLeft as ChevronLeftIcon } from '#lib/icons/index.ts';
	import { buttonVariants, type ButtonVariant } from '#lib/components/ui/button/index.ts';
	import { _ } from 'svelte-i18n';
	import { cn } from '#lib/utils/cn.ts';

	let {
		ref = $bindable(null),
		class: className,
		children,
		variant = 'ghost',
		'aria-label': ariaLabel,
		...restProps
	}: RangeCalendarPrimitive.PrevButtonProps & {
		variant?: ButtonVariant;
	} = $props();
</script>

{#snippet Fallback()}
	<ChevronLeftIcon class={cn('rtl:rotate-180 size-4', className)} />
{/snippet}

<RangeCalendarPrimitive.PrevButton
	bind:ref
	class={cn(
		buttonVariants({ variant }),
		'size-(--cell-size) bg-transparent p-0 select-none disabled:opacity-50',
		'rtl:rotate-180',
		className
	)}
	{...restProps}
>
	{#snippet child({ props })}
		<button {...props} aria-label={ariaLabel ?? $_('form.calendar.previousMonth')}>
			{#if children}
				{@render children?.()}
			{:else}
				{@render Fallback()}
			{/if}
		</button>
	{/snippet}
</RangeCalendarPrimitive.PrevButton>
