<script lang="ts" module>
	export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
	export type BadgeStyle = 'solid' | 'soft' | 'outline';
	export type BadgeSize = 'sm' | 'md';
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

	/**
	 * Token map — every visual decision routes through a CSS variable
	 * pair (`--color-{role}-{50,900}`) defined in tokens.css. NEVER
	 * inline hex / RGB / oklch literals here; if a new role needs a
	 * pair, add it in tokens.css first.
	 */
	const stylesByVariant: Record<BadgeVariant, Record<BadgeStyle, string>> = {
		neutral: {
			solid: 'bg-[var(--color-fg)] text-[var(--color-bg-elevated)]',
			soft: 'bg-[var(--color-bg-muted)] text-[var(--color-fg)]',
			outline: 'border border-[var(--color-border)] text-[var(--color-fg)]'
		},
		success: {
			solid: 'bg-[var(--color-success-500)] text-white',
			soft: 'bg-[var(--color-success-50)] text-[var(--color-success-900)]',
			outline: 'border border-[var(--color-success-500)] text-[var(--color-success-900)]'
		},
		warning: {
			solid: 'bg-[var(--color-warning-500)] text-white',
			soft: 'bg-[var(--color-warning-50)] text-[var(--color-warning-900)]',
			outline: 'border border-[var(--color-warning-500)] text-[var(--color-warning-900)]'
		},
		danger: {
			solid: 'bg-[var(--color-danger-500)] text-white',
			soft: 'bg-[var(--color-danger-50)] text-[var(--color-danger-900)]',
			outline: 'border border-[var(--color-danger-500)] text-[var(--color-danger-900)]'
		},
		info: {
			solid: 'bg-[var(--color-info-500)] text-white',
			soft: 'bg-[var(--color-info-50)] text-[var(--color-info-900)]',
			outline: 'border border-[var(--color-info-500)] text-[var(--color-info-900)]'
		},
		brand: {
			solid: 'bg-[var(--color-primary)] text-white',
			soft: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
			outline: 'border border-[var(--color-primary)] text-[var(--color-primary)]'
		}
	};

	const sizes: Record<BadgeSize, string> = {
		sm: 'px-1.5 py-0.5 text-[0.6875rem]',
		md: 'px-2 py-0.5 text-xs'
	};
</script>

<span
	class={cn(
		'label-small inline-flex items-center rounded-full leading-tight',
		stylesByVariant[variant][badgeStyle],
		sizes[size],
		className
	)}
>
	{@render children()}
</span>
