<!-- src/lib/components/ui/slider/Slider.svelte -->
<!--
	Slider — single-thumb slider over bits-ui Slider.

	bits-ui handles keyboard navigation (arrow keys to step, PageUp/Down
	for larger steps, Home/End for min/max), pointer drag, and ARIA
	slider semantics. Slider.Root is the track container; Slider.Range
	is the highlighted fill (auto-positioned by bits-ui); Slider.Thumb
	is the draggable handle (auto-positioned by bits-ui).

	Single-thumb only — range sliders (`type='multiple'`) belong in a
	separate primitive when 3+ features need them (Rule of Three).
-->
<script lang="ts">
	import { Slider as BitsSlider } from 'bits-ui';
	import { cn } from '$lib/utils/cn';

	type Props = {
		value?: number;
		onValueChange?: (value: number) => void;
		onValueCommit?: (value: number) => void;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		orientation?: 'horizontal' | 'vertical';
		'aria-label'?: string;
		class?: string;
	};

	let {
		value = $bindable(0),
		onValueChange,
		onValueCommit,
		min = 0,
		max = 100,
		step = 1,
		disabled = false,
		orientation = 'horizontal',
		'aria-label': ariaLabel,
		class: className = ''
	}: Props = $props();
</script>

<BitsSlider.Root
	type="single"
	bind:value
	{onValueChange}
	{onValueCommit}
	{min}
	{max}
	{step}
	{disabled}
	{orientation}
	aria-label={ariaLabel}
	class={cn(
		'relative flex w-full touch-none items-center select-none',
		'bg-bg-muted h-1 rounded-full',
		"data-[orientation='vertical']:h-full data-[orientation='vertical']:w-1 data-[orientation='vertical']:flex-col",
		'data-[disabled]:opacity-50',
		className
	)}
>
	<BitsSlider.Range
		class={cn('bg-primary h-full rounded-full', "data-[orientation='vertical']:w-full")}
	/>
	<BitsSlider.Thumb
		index={0}
		class={cn(
			'bg-primary block size-4 rounded-full shadow-md',
			'border-2 border-[var(--color-bg-elevated)]',
			'transition-transform duration-[var(--duration-fast)]',
			'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
			'hover:scale-110 active:scale-95',
			'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
		)}
	/>
</BitsSlider.Root>
