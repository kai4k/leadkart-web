<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	/**
	 * Button primitive — class-variance-authority pattern (shadcn-svelte
	 * canonical). Variants composed via tokens; consumers pick variant
	 * + size. Custom classes still mergeable via the `class` prop +
	 * `cn()` utility.
	 *
	 * Industry refs: shadcn-svelte Button, Radix Primitives Button,
	 * Material 3 button hierarchy (filled / tonal / outlined / text).
	 */
	export const buttonVariants = cva(
		[
			'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
			'transition-colors',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
			'disabled:cursor-not-allowed disabled:opacity-60',
			'motion-reduce:transition-none'
		],
		{
			variants: {
				variant: {
					primary:
						'bg-[var(--color-brand-600)] text-[var(--color-fg-on-brand)] hover:bg-[var(--color-brand-700)]',
					secondary:
						'bg-[var(--color-bg-muted)] text-[var(--color-fg)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border)]',
					ghost: 'text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]',
					danger:
						'bg-[var(--color-danger-600)] text-[var(--color-fg-on-brand)] hover:bg-[var(--color-danger-700)]',
					link: 'text-[var(--color-brand-600)] underline-offset-4 hover:underline hover:text-[var(--color-brand-700)] p-0 h-auto'
				},
				size: {
					sm: 'h-8 px-3 body-sm',
					md: 'h-10 px-4 body-sm',
					lg: 'h-11 px-5 body-base',
					icon: 'h-10 w-10 p-0'
				},
				fullWidth: {
					true: 'w-full',
					false: ''
				}
			},
			defaultVariants: {
				variant: 'primary',
				size: 'md',
				fullWidth: false
			}
		}
	);

	export type ButtonVariants = VariantProps<typeof buttonVariants>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';
	import Spinner from './Spinner.svelte';

	type Props = HTMLButtonAttributes &
		ButtonVariants & {
			loading?: boolean;
			children?: Snippet;
		};

	let {
		variant = 'primary',
		size = 'md',
		fullWidth = false,
		loading = false,
		disabled = false,
		type = 'button',
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

<button
	{type}
	disabled={disabled || loading}
	aria-busy={loading || undefined}
	class={cn(buttonVariants({ variant, size, fullWidth }), className)}
	{...rest}
>
	{#if loading}
		<Spinner size={size === 'lg' ? 18 : 16} aria-hidden="true" />
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>
