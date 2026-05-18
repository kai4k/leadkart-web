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
					brand: ''
				},
				style: {
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
				{
					variant: 'neutral',
					style: 'solid',
					class: 'bg-[var(--color-fg)] text-[var(--color-bg-elevated)]'
				},
				{
					variant: 'neutral',
					style: 'soft',
					class: 'bg-[var(--color-bg-muted)] text-[var(--color-fg)]'
				},
				{
					variant: 'neutral',
					style: 'outline',
					class: 'border-[var(--color-border)] text-[var(--color-fg)]'
				},
				{
					variant: 'success',
					style: 'solid',
					class: 'bg-[var(--color-success-500)] text-white'
				},
				{
					variant: 'success',
					style: 'soft',
					class: 'bg-[var(--color-success-50)] text-[var(--color-success-900)]'
				},
				{
					variant: 'success',
					style: 'outline',
					class: 'border-[var(--color-success-500)] text-[var(--color-success-900)]'
				},
				{
					variant: 'warning',
					style: 'solid',
					class: 'bg-[var(--color-warning-500)] text-white'
				},
				{
					variant: 'warning',
					style: 'soft',
					class: 'bg-[var(--color-warning-50)] text-[var(--color-warning-900)]'
				},
				{
					variant: 'warning',
					style: 'outline',
					class: 'border-[var(--color-warning-500)] text-[var(--color-warning-900)]'
				},
				{
					variant: 'danger',
					style: 'solid',
					class: 'bg-[var(--color-danger-500)] text-white'
				},
				{
					variant: 'danger',
					style: 'soft',
					class: 'bg-[var(--color-danger-50)] text-[var(--color-danger-900)]'
				},
				{
					variant: 'danger',
					style: 'outline',
					class: 'border-[var(--color-danger-500)] text-[var(--color-danger-900)]'
				},
				{
					variant: 'info',
					style: 'solid',
					class: 'bg-[var(--color-info-500)] text-white'
				},
				{
					variant: 'info',
					style: 'soft',
					class: 'bg-[var(--color-info-50)] text-[var(--color-info-900)]'
				},
				{
					variant: 'info',
					style: 'outline',
					class: 'border-[var(--color-info-500)] text-[var(--color-info-900)]'
				},
				{
					variant: 'brand',
					style: 'solid',
					class: 'bg-[var(--color-primary)] text-white'
				},
				{
					variant: 'brand',
					style: 'soft',
					class: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
				},
				{
					variant: 'brand',
					style: 'outline',
					class: 'border-[var(--color-primary)] text-[var(--color-primary)]'
				}
			],
			defaultVariants: {
				variant: 'neutral',
				style: 'soft',
				size: 'md'
			}
		}
	);

	export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
	export type BadgeStyle = NonNullable<VariantProps<typeof badgeVariants>['style']>;
	export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;
	export type BadgeVariants = VariantProps<typeof badgeVariants>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		variant?: BadgeVariant;
		style?: BadgeStyle;
		size?: BadgeSize;
		class?: string;
		children: Snippet;
	};

	let {
		variant = 'neutral',
		style: badgeStyle = 'soft',
		size = 'md',
		class: className = '',
		children
	}: Props = $props();
</script>

<span class={cn(badgeVariants({ variant, style: badgeStyle, size }), className)}>
	{@render children()}
</span>
