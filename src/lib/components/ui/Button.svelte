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
			// Apple-spring interaction system: spring-eased hover lift + active scale.
			// Composes with .interactive utility (transform/shadow/bg/filter transitions).
			// `link` variant overrides scale via :where() in its own variant string.
			'interactive',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
			'disabled:cursor-not-allowed disabled:opacity-60 disabled:!transform-none',
			'motion-reduce:!transition-none motion-reduce:!transform-none motion-reduce:hover:!transform-none'
		],
		{
			variants: {
				variant: {
					// Primary — navy-violet brand gradient + brand-halo glow + sheen sweep.
					// `relative overflow-hidden` enables the .glass-sheen ::after overlay.
					primary:
						'relative overflow-hidden bg-gradient-to-b from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-[var(--color-fg-on-brand)] hover:from-[var(--color-brand-400)] hover:to-[var(--color-brand-600)] brand-halo glass-sheen',
					// Secondary — vibrant logo green for "growth" CTAs (purchase lead,
					// confirm conversion). Gradient from-700 → to-900 with white text
					// keeps WCAG 2.2 AA on both stops:
					//   secondary-700 oklch(0.48) on white text ≈ 5.5:1 ✓
					//   secondary-900 oklch(0.28) on white text ≈ 9.8:1 ✓
					// Hover lifts to from-600 → to-800 (still AA-safe).
					// Earlier from-400 → to-600 failed AA on the lighter stop (~2.8:1).
					secondary:
						'bg-gradient-to-b from-[var(--color-secondary-700)] to-[var(--color-secondary-900)] text-white hover:from-[var(--color-secondary-600)] hover:to-[var(--color-secondary-800)] shadow-[var(--shadow-secondary)]',
					// Tonal — quiet neutral, secondary actions on a busy page.
					tonal:
						'bg-[var(--color-bg-muted)] text-[var(--color-fg)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border)]',
					// Ghost — text-only with hover bg, lowest emphasis.
					ghost: 'text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]',
					// Danger — system red, for destructive confirms.
					danger:
						'bg-gradient-to-b from-[var(--color-danger-500)] to-[var(--color-danger-700)] text-[var(--color-fg-on-brand)] hover:from-[var(--color-danger-400)] hover:to-[var(--color-danger-600)] shadow-[var(--shadow-danger)]',
					// Glass — frosted iOS-style button on top of imagery / hero panels.
					glass:
						'relative overflow-hidden glass-popover glass-sheen text-[var(--color-fg)] hover:text-[var(--color-brand-700)]',
					// Link — pure text, no transform on hover/press (overrides .interactive).
					link: '!transform-none hover:!transform-none active:!transform-none text-[var(--color-brand-600)] underline-offset-4 hover:underline hover:text-[var(--color-brand-700)] p-0 h-auto'
				},
				// Touch targets — Apple HIG floor 44px for primary tap surfaces,
				// Material 3 floor 48px. md=h-11 (44px) hits Apple; lg=h-12 (48px)
				// hits Material. sm=h-9 (36px) is desktop-tight (toolbars + chips)
				// and explicitly NOT recommended for primary mobile CTAs.
				size: {
					sm: 'h-9 px-3 body-sm',
					md: 'h-11 px-4 body-sm',
					lg: 'h-12 px-5 body-base',
					icon: 'h-11 w-11 p-0'
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
