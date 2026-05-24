<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	/**
	 * Badge — small status / counter pill.
	 *
	 * Variant API:
	 *   variant    = colour intent (neutral / success / warning / danger / info / brand)
	 *   appearance = fill style (solid / soft / outline)
	 *   size       = sm / md
	 *
	 * Industry refs: Polaris `Badge`, Linear status pill, Atlassian Lozenge,
	 * GitHub Primer Label. All three use a `solid | subtle | outline` triad
	 * with semantic colour intents; we mirror the convention with
	 * `solid | soft | outline` and the same colour set.
	 *
	 * Note: this prop was previously named `style`, which collided with
	 * HTML's native `style` attribute (stylelint parses inline
	 * style=…soft… as a CSS declaration and chokes). Renamed
	 * 2026-05-24 to `appearance` to match the Polaris / Atlassian canon.
	 */
	export const badgeVariants = cva(
		'label-small inline-flex items-center rounded-full leading-tight',
		{
			variants: {
				variant: {
					neutral: '',
					success: '',
					warning: '',
					danger: '',
					info: '',
					brand: ''
				},
				appearance: {
					solid: '',
					soft: '',
					outline: 'border'
				},
				size: {
					sm: 'px-1.5 py-0.5 text-[var(--text-2xs)]',
					md: 'px-2 py-0.5 text-xs'
				}
			},
			compoundVariants: [
				{ variant: 'neutral', appearance: 'solid', class: 'bg-fg text-bg-elevated' },
				{ variant: 'neutral', appearance: 'soft', class: 'bg-bg-muted text-fg' },
				{ variant: 'neutral', appearance: 'outline', class: 'border-border text-fg' },
				{ variant: 'success', appearance: 'solid', class: 'bg-success-500 text-white' },
				{ variant: 'success', appearance: 'soft', class: 'bg-success-50 text-success-900' },
				{ variant: 'success', appearance: 'outline', class: 'border-success-500 text-success-900' },
				{ variant: 'warning', appearance: 'solid', class: 'bg-warning-500 text-white' },
				{ variant: 'warning', appearance: 'soft', class: 'bg-warning-50 text-warning-900' },
				{ variant: 'warning', appearance: 'outline', class: 'border-warning-500 text-warning-900' },
				{ variant: 'danger', appearance: 'solid', class: 'bg-danger-500 text-white' },
				{ variant: 'danger', appearance: 'soft', class: 'bg-danger-50 text-danger-900' },
				{ variant: 'danger', appearance: 'outline', class: 'border-danger-500 text-danger-900' },
				{ variant: 'info', appearance: 'solid', class: 'bg-info-500 text-white' },
				{ variant: 'info', appearance: 'soft', class: 'bg-info-50 text-info-900' },
				{ variant: 'info', appearance: 'outline', class: 'border-info-500 text-info-900' },
				{ variant: 'brand', appearance: 'solid', class: 'bg-primary text-white' },
				{ variant: 'brand', appearance: 'soft', class: 'bg-primary-soft text-primary' },
				{ variant: 'brand', appearance: 'outline', class: 'border-primary text-primary' }
			],
			defaultVariants: {
				variant: 'neutral',
				appearance: 'soft',
				size: 'md'
			}
		}
	);

	export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
	export type BadgeAppearance = NonNullable<VariantProps<typeof badgeVariants>['appearance']>;
	export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;
	export type BadgeVariants = VariantProps<typeof badgeVariants>;

	/** Legacy alias for compat with v0 call sites — use `BadgeAppearance` in new code. */
	export type BadgeStyle = BadgeAppearance;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		variant?: BadgeVariant;
		appearance?: BadgeAppearance;
		size?: BadgeSize;
		class?: string;
		children: Snippet;
	};

	let {
		variant = 'neutral',
		appearance = 'soft',
		size = 'md',
		class: className = '',
		children
	}: Props = $props();
</script>

<span class={cn(badgeVariants({ variant, appearance, size }), className)}>
	{@render children()}
</span>
