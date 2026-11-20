<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	import type { HTMLAnchorAttributes, HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';

	/**
	 * shadcn-svelte `badge` (nova) with LeadKart edits: `cva`, no alpha, and the soft status
	 * variants (`StatusVariant` in utils/status.ts): `neutral | info | success | warning | danger |
	 * brand`. Each pair is checked by the token contrast gate.
	 */
	export const badgeVariants = cva(
		[
			'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs leading-tight font-medium whitespace-nowrap',
			'focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3'
		],
		{
			variants: {
				variant: {
					default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary-hover',
					secondary: 'bg-secondary text-secondary-foreground',
					destructive: 'bg-destructive text-destructive-foreground [a&]:hover:bg-destructive-hover',
					outline: 'border-border text-foreground [a&]:hover:bg-muted',
					neutral: 'bg-muted text-muted-foreground',
					info: 'bg-info-soft text-info',
					success: 'bg-success-soft text-success',
					warning: 'bg-warning-soft text-warning',
					danger: 'bg-destructive-soft text-destructive',
					brand: 'bg-primary-soft text-primary'
				},
				// `sm` is the compact badge of dense lists, status columns and card corners (what
				// `size="sm"` was before Phase 2): the 2xs type step and tighter inline padding.
				size: {
					default: '',
					sm: 'px-1.5 text-2xs'
				}
			},
			defaultVariants: { variant: 'neutral', size: 'default' }
		}
	);

	export type BadgeVariants = VariantProps<typeof badgeVariants>;
	export type BadgeVariant = NonNullable<BadgeVariants['variant']>;
	export type BadgeSize = NonNullable<BadgeVariants['size']>;
	export type BadgeProps = WithElementRef<HTMLAttributes<HTMLSpanElement>> &
		WithElementRef<HTMLAnchorAttributes> &
		BadgeVariants;
</script>

<script lang="ts">
	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = 'neutral',
		size = 'default',
		children,
		...restProps
	}: BadgeProps = $props();
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	bind:this={ref}
	data-slot="badge"
	{href}
	class={cn(badgeVariants({ variant, size }), className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
