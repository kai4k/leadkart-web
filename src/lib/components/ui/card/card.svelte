<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	export const cardVariants = cva(
		[
			'group/card flex flex-col gap-4 overflow-hidden rounded-xl text-sm',
			'ring-1 ring-border',
			'has-data-[slot=card-footer]:pb-0',
			'has-[>img:first-child]:pt-0',
			'*:[img:first-child]:rounded-t-xl',
			'*:[img:last-child]:rounded-b-xl'
		],
		{
			variants: {
				padding: {
					sm: 'px-3 py-3',
					md: 'px-5 py-4',
					lg: 'px-7 py-6 gap-5'
				},
				elevation: { none: '', sm: 'shadow-card', md: 'shadow-md' },
				surface: {
					default: 'bg-bg-elevated text-fg',
					solid: 'bg-bg-elevated text-fg',
					glass: 'glass-card text-fg'
				},
				interactive: { true: 'interactive cursor-pointer', false: '' }
			},
			defaultVariants: { padding: 'md', elevation: 'sm', surface: 'default', interactive: false }
		}
	);

	export type CardPadding = NonNullable<VariantProps<typeof cardVariants>['padding']>;
	export type CardElevation = NonNullable<VariantProps<typeof cardVariants>['elevation']>;
	export type CardSurface = NonNullable<VariantProps<typeof cardVariants>['surface']>;
	export type CardVariants = VariantProps<typeof cardVariants>;
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & CardVariants;
	let {
		ref = $bindable(null),
		padding = 'md',
		elevation = 'sm',
		surface = 'default',
		interactive = false,
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(cardVariants({ padding, elevation, surface, interactive }), className)}
	{...rest}
>
	{@render children?.()}
</div>
