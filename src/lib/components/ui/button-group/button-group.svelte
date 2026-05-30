<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	export const buttonGroupVariants = cva('flex w-fit items-stretch', {
		variants: {
			orientation: {
				horizontal:
					'[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:border-l-0',
				vertical:
					'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:border-t-0'
			}
		},
		defaultVariants: { orientation: 'horizontal' }
	});
	export type ButtonGroupOrientation = VariantProps<typeof buttonGroupVariants>['orientation'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';
	let {
		ref = $bindable(null),
		class: className,
		orientation = 'horizontal',
		children,
		...rest
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		orientation?: ButtonGroupOrientation;
	} = $props();
</script>

<div
	bind:this={ref}
	role="group"
	data-slot="button-group"
	data-orientation={orientation}
	class={cn(buttonGroupVariants({ orientation }), className)}
	{...rest}
>
	{@render children?.()}
</div>
