<script lang="ts" module>
	/**
	 * Card — shadcn-svelte canonical structure (data-slot, $bindable ref,
	 * tv variants) extended with the LeadKart legacy prop surface:
	 *
	 *   padding    sm | md | lg               (px-3/py-3, px-5/py-4, px-7/py-6)
	 *   elevation  none | sm | md             (no shadow, shadow-card, shadow-md)
	 *   surface    default | glass            (default tinted bg vs Liquid Glass)
	 *   interactive  boolean                  (hover lift + spring ease)
	 */
	import { type VariantProps, tv } from 'tailwind-variants';

	export const cardVariants = tv({
		base: [
			'group/card flex flex-col gap-4 overflow-hidden rounded-xl text-sm',
			'ring-1 ring-foreground/10',
			'has-data-[slot=card-footer]:pb-0',
			'has-[>img:first-child]:pt-0',
			'*:[img:first-child]:rounded-t-xl',
			'*:[img:last-child]:rounded-b-xl'
		],
		variants: {
			padding: {
				sm: 'px-3 py-3 data-[size=sm]:gap-3',
				md: 'px-5 py-4',
				lg: 'px-7 py-6 gap-5'
			},
			elevation: {
				none: '',
				sm: 'shadow-card',
				md: 'shadow-md'
			},
			surface: {
				default: 'bg-card text-card-foreground',
				solid: 'bg-card text-card-foreground',
				glass: 'glass-card text-fg'
			},
			interactive: {
				true: 'interactive cursor-pointer',
				false: ''
			}
		},
		defaultVariants: {
			padding: 'md',
			elevation: 'sm',
			surface: 'default',
			interactive: false
		}
	});

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
	data-padding={padding}
	data-elevation={elevation}
	data-surface={surface}
	class={cn(cardVariants({ padding, elevation, surface, interactive }), className)}
	{...rest}
>
	{@render children?.()}
</div>
