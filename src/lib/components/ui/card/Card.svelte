<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const cardVariants = cva([''], {
		variants: {
			/* `surface` decouples shape from material. Switch a card from
			 * solid white panel to Liquid-Glass thick material (or no
			 * fill at all) by changing one prop.
			 *   solid : opaque white with rounded-lg + 1px border (legacy)
			 *   glass : .glass-card utility — translucent thick material
			 *           with backdrop-filter + inner gradient + 1.5rem
			 *           radius (the radius lives in .glass-card so we
			 *           don't double-set it from the base classes).
			 *   none  : structure only, caller paints the surface
			 */
			surface: {
				solid: 'rounded-lg border bg-[var(--color-bg-elevated)] border-[var(--color-border)]',
				glass: 'glass-card',
				none: ''
			},
			padding: {
				none: '',
				sm: 'p-3',
				md: 'p-4',
				lg: 'p-6'
			},
			elevation: {
				none: '',
				sm: 'shadow-sm',
				md: 'shadow',
				lg: 'shadow-md'
			},
			/* `interactive` enables Apple-spring hover lift + active press
			 * via the .interactive utility (utilities.css). Use for
			 * clickable card grid items (lead cards in marketplace,
			 * dashboard widgets with drilldowns). */
			interactive: {
				true: 'interactive cursor-pointer',
				false: ''
			}
		},
		defaultVariants: {
			surface: 'solid',
			padding: 'none',
			elevation: 'none',
			interactive: false
		}
	});

	export type CardVariants = VariantProps<typeof cardVariants>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	type Props = HTMLAttributes<HTMLDivElement> &
		CardVariants & {
			children?: Snippet;
		};

	let {
		surface = 'solid',
		padding = 'none',
		elevation = 'none',
		interactive = false,
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

<div class={cn(cardVariants({ surface, padding, elevation, interactive }), className)} {...rest}>
	{#if children}{@render children()}{/if}
</div>
