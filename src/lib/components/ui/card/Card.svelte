<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const cardVariants = cva(
		['rounded-lg border bg-[var(--color-bg-elevated)] border-[var(--color-border)]'],
		{
			variants: {
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
				 * via the .interactive utility (utilities.css). Use for clickable
				 * card grid items (lead cards in marketplace, dashboard widgets
				 * with drilldowns). Combine with elevation="md" for the full
				 * "magnetic" pull feel. Pointer-coarse devices skip the hover
				 * transform via `@media (hover: hover)` — touch users get the
				 * press scale only.
				 *
				 * `glass` switches the surface to a frosted translucent panel
				 * (uses .glass-popover blur/saturate/border-highlight). Combine
				 * with .glass-sheen for the on-hover gloss sweep. */
				interactive: {
					true: 'interactive cursor-pointer',
					false: ''
				},
				glass: {
					true: 'glass-popover',
					false: ''
				}
			},
			defaultVariants: {
				padding: 'none',
				elevation: 'none',
				interactive: false,
				glass: false
			}
		}
	);

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
		padding = 'none',
		elevation = 'none',
		interactive = false,
		glass = false,
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

<div class={cn(cardVariants({ padding, elevation, interactive, glass }), className)} {...rest}>
	{#if children}{@render children()}{/if}
</div>
