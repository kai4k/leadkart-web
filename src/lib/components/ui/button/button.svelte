<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	/**
	 * Pebble World button (spec 7.1): a clay capsule. `primary | tonal | secondary | ghost |
	 * destructive | link` (`default` is now `primary`, `outline` is now `secondary`), sizes `sm | md |
	 * lg | icon` (+ `icon-sm`, the compact in-field icon), and `loading`. Opaque hover tokens (L37:
	 * never `/90`). The clay variants squish to `--press-scale` and lift by `--lift`, both under
	 * `motion-safe` only; the edge is `--solid-edge` (a system colour in forced colours). Capsule
	 * (`rounded-full`) on every variant but `link` (plan G7, Q1). See ui/CUSTOMIZATIONS.md.
	 */
	// the clay body: the shadow is the token, not a re-drawn one (a `material-*` utility would also set a fill that fights the variant's)
	const lift =
		'rounded-full motion-safe:hover:-translate-y-(--lift) motion-safe:active:translate-y-0 motion-safe:active:scale-(--press-scale)';
	const clay = `${lift} border-(--solid-edge) shadow-(--shadow-clay-sm)`;
	export const buttonVariants = cva(
		[
			'group/button inline-flex shrink-0 items-center justify-center gap-2 border border-transparent text-sm font-semibold whitespace-nowrap',
			'transition-[transform,background-color,color,filter] duration-(--duration-fast) outline-none select-none',
			'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
			'disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60',
			'motion-reduce:transition-none',
			"[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
		],
		{
			variants: {
				variant: {
					primary: `${clay} bg-primary text-primary-foreground hover:bg-primary-hover`,
					tonal: `${clay} bg-primary-tonal text-primary-tonal-foreground hover:brightness-95 dark:hover:brightness-110`,
					secondary: `${lift} material-clay-sm text-foreground hover:bg-muted aria-expanded:bg-muted`,
					ghost:
						'rounded-full text-primary-text hover:bg-primary-soft aria-expanded:bg-primary-soft motion-safe:active:scale-(--press-scale)',
					destructive: `${clay} bg-destructive text-destructive-foreground hover:bg-destructive-hover`,
					link: 'text-primary-text underline-offset-4 hover:underline'
				},
				size: {
					sm: 'h-9 px-4',
					md: 'h-11 px-5',
					lg: 'h-13 px-6 text-base',
					icon: 'size-11',
					'icon-sm': 'size-9'
				}
			},
			compoundVariants: [{ variant: 'link', class: 'h-auto p-0' }],
			defaultVariants: { variant: 'primary', size: 'md' }
		}
	);

	export type ButtonVariants = VariantProps<typeof buttonVariants>;
	export type ButtonVariant = NonNullable<ButtonVariants['variant']>;
	export type ButtonSize = NonNullable<ButtonVariants['size']>;

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> &
		ButtonVariants & {
			/** Shows a spinner, sets `aria-busy`, and disables the button (see `focusableWhileLoading`). */
			loading?: boolean;
			/**
			 * While `loading`, stay in the tab order: `aria-disabled` + `aria-busy` instead of `disabled`,
			 * and clicks are ignored. For a control that is focused while it loads (the infinite-list
			 * "Load more"), where `disabled` would drop focus to `<body>`.
			 */
			focusableWhileLoading?: boolean;
		};

	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
</script>

<script lang="ts">
	import Spinner from '../spinner/Spinner.svelte';

	let {
		class: className,
		variant = 'primary',
		size = 'md',
		loading = false,
		focusableWhileLoading = false,
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled = false,
		onclick,
		children,
		...restProps
	}: ButtonProps = $props();

	const inertWhileLoading = $derived(loading && focusableWhileLoading);
	const classes = $derived(cn(buttonVariants({ variant, size }), className));
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- a generic link button: the caller passes a resolved href -->
{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={classes}
		href={disabled ? undefined : href}
		aria-disabled={disabled || undefined}
		aria-busy={loading || undefined}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		{onclick}
		{...restProps as HTMLAnchorAttributes}
	>
		{#if loading}<Spinner size={size === 'lg' ? 18 : 16} aria-hidden="true" />{/if}
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={classes}
		{type}
		disabled={disabled || (loading && !focusableWhileLoading)}
		aria-disabled={inertWhileLoading ? 'true' : undefined}
		aria-busy={loading || undefined}
		onclick={inertWhileLoading ? undefined : onclick}
		{...restProps as HTMLButtonAttributes}
	>
		{#if loading}<Spinner size={size === 'lg' ? 18 : 16} aria-hidden="true" />{/if}
		{@render children?.()}
	</button>
{/if}
<!-- eslint-enable svelte/no-navigation-without-resolve -->
