<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	/**
	 * Cards are solid materials (never the translucent kind). Three surfaces: `clay` (the default, a raised white card), `sheet` (a working surface: the
	 * big flat sheet a table or an app frame sits on) and `tray` (a recessed, tinted holder). The material owns the fill,
	 * the shadow and the 1px edge that stays visible under forced colours and increased contrast.
	 */
	export const cardVariants = cva(
		[
			'group/card text-foreground flex flex-col gap-4 overflow-hidden rounded-card text-sm',
			'has-data-[slot=card-footer]:pb-0',
			'has-[>img:first-child]:pt-0',
			'*:[img:first-child]:rounded-t-card',
			'*:[img:last-child]:rounded-b-card'
		],
		{
			variants: {
				padding: {
					sm: 'px-3 py-3',
					md: 'px-5 py-4',
					lg: 'px-7 py-6 gap-5'
				},
				surface: {
					clay: 'material-clay',
					sheet: 'material-sheet',
					tray: 'material-tray'
				},
				interactive: { true: 'interactive cursor-pointer', false: '' }
			},
			defaultVariants: { padding: 'md', surface: 'clay', interactive: false }
		}
	);

	export type CardPadding = NonNullable<VariantProps<typeof cardVariants>['padding']>;
	export type CardSurface = NonNullable<VariantProps<typeof cardVariants>['surface']>;
	export type CardVariants = VariantProps<typeof cardVariants>;
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & CardVariants;
	let {
		ref = $bindable(null),
		padding = 'md',
		surface = 'clay',
		interactive = false,
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(cardVariants({ padding, surface, interactive }), className)}
	{...rest}
>
	{@render children?.()}
</div>
