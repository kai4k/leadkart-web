<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
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
					brand: '',
					default: '',
					secondary: '',
					outline: 'border',
					destructive: ''
				},
				appearance: { solid: '', soft: '', outline: 'border' },
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
				{ variant: 'brand', appearance: 'outline', class: 'border-primary text-primary' },
				{ variant: 'default', appearance: 'solid', class: 'bg-primary text-white' },
				{ variant: 'default', appearance: 'soft', class: 'bg-primary-soft text-primary' },
				{ variant: 'secondary', appearance: 'solid', class: 'bg-secondary-500 text-white' },
				{ variant: 'secondary', appearance: 'soft', class: 'bg-secondary-50 text-secondary-900' },
				{ variant: 'destructive', appearance: 'solid', class: 'bg-danger-500 text-white' },
				{ variant: 'destructive', appearance: 'soft', class: 'bg-danger-50 text-danger-900' }
			],
			defaultVariants: { variant: 'neutral', appearance: 'soft', size: 'md' }
		}
	);
	export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
	export type BadgeAppearance = NonNullable<VariantProps<typeof badgeVariants>['appearance']>;
	export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;
	export type BadgeVariants = VariantProps<typeof badgeVariants>;
	export type BadgeStyle = BadgeAppearance;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';

	type Props = WithElementRef<HTMLAttributes<HTMLSpanElement>> &
		WithElementRef<HTMLAnchorAttributes> &
		BadgeVariants & { href?: string; children: Snippet };

	let {
		variant = 'neutral',
		appearance = 'soft',
		size = 'md',
		href,
		ref = $bindable(null),
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	bind:this={ref}
	data-slot="badge"
	{href}
	class={cn(badgeVariants({ variant, appearance, size }), className)}
	{...rest}
>
	{@render children()}
</svelte:element>
