<script lang="ts">
	import { ScrollArea as ScrollAreaPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils/cn';

	let {
		ref = $bindable(null),
		class: className,
		orientation = 'vertical',
		scrollbarXClasses = '',
		scrollbarYClasses = '',
		children,
		...rest
	}: ScrollAreaPrimitive.RootProps & {
		orientation?: 'vertical' | 'horizontal' | 'both';
		scrollbarXClasses?: string;
		scrollbarYClasses?: string;
	} = $props();
</script>

<ScrollAreaPrimitive.Root
	bind:ref
	data-slot="scroll-area"
	class={cn('relative overflow-hidden', className)}
	{...rest}
>
	<ScrollAreaPrimitive.Viewport class="h-full w-full rounded-[inherit]">
		{@render children?.()}
	</ScrollAreaPrimitive.Viewport>
	{#if orientation === 'vertical' || orientation === 'both'}
		<ScrollAreaPrimitive.Scrollbar
			orientation="vertical"
			class={cn(
				'flex h-full w-2.5 touch-none select-none border-l border-l-transparent p-px transition-colors',
				scrollbarYClasses
			)}
		>
			<ScrollAreaPrimitive.Thumb class="relative flex-1 rounded-full bg-border" />
		</ScrollAreaPrimitive.Scrollbar>
	{/if}
	{#if orientation === 'horizontal' || orientation === 'both'}
		<ScrollAreaPrimitive.Scrollbar
			orientation="horizontal"
			class={cn(
				'flex h-2.5 w-full touch-none select-none border-t border-t-transparent p-px transition-colors',
				scrollbarXClasses
			)}
		>
			<ScrollAreaPrimitive.Thumb class="relative rounded-full bg-border" />
		</ScrollAreaPrimitive.Scrollbar>
	{/if}
	<ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>
