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
					class: 'bg-fg text-bg-elevated'
				},
				{
					variant: 'neutral',
					style: 'soft',
					class: 'bg-bg-muted text-fg'
				},
				{
					variant: 'neutral',
					style: 'outline',
					class: 'border-border text-fg'
				},
				{
					variant: 'success',
					style: 'solid',
					class: 'bg-success-500 text-white'
				},
				{
					variant: 'success',
					style: 'soft',
					class: 'bg-success-50 text-success-900'
				},
				{
					variant: 'success',
					style: 'outline',
					class: 'border-success-500 text-success-900'
				},
				{
					variant: 'warning',
					style: 'solid',
					class: 'bg-warning-500 text-white'
				},
				{
					variant: 'warning',
					style: 'soft',
					class: 'bg-warning-50 text-warning-900'
				},
				{
					variant: 'warning',
					style: 'outline',
					class: 'border-warning-500 text-warning-900'
				},
				{
					variant: 'danger',
					style: 'solid',
					class: 'bg-danger-500 text-white'
				},
				{
					variant: 'danger',
					style: 'soft',
					class: 'bg-danger-50 text-danger-900'
				},
				{
					variant: 'danger',
					style: 'outline',
					class: 'border-danger-500 text-danger-900'
				},
				{
					variant: 'info',
					style: 'solid',
					class: 'bg-info-500 text-white'
				},
				{
					variant: 'info',
					style: 'soft',
					class: 'bg-info-50 text-info-900'
				},
				{
					variant: 'info',
					style: 'outline',
					class: 'border-info-500 text-info-900'
				},
				{
					variant: 'brand',
					style: 'solid',
					class: 'bg-primary text-white'
				},
				{
					variant: 'brand',
					style: 'soft',
					class: 'bg-primary-soft text-primary'
				},
				{
					variant: 'brand',
					style: 'outline',
					class: 'border-primary text-primary'
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
