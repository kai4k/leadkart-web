<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	/**
	 * shadcn-svelte `button` (nova) with LeadKart edits: `cva` instead of tailwind-variants, the
	 * Domiex sizes (h-10 px-6 default, h-8 sm, h-12 lg), opaque hover tokens (L37: never `/90`),
	 * a solid `destructive`, a `tonal` variant, and `loading`. See ui/CUSTOMIZATIONS.md.
	 */
	export const buttonVariants = cva(
		[
			'group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-sm font-medium whitespace-nowrap',
			'transition-colors outline-none select-none',
			'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
			'active:not-aria-[haspopup]:translate-y-px',
			'disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60',
			'motion-reduce:transition-none motion-reduce:active:translate-y-0',
			"[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
		],
		{
			variants: {
				variant: {
					default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
					destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
					outline:
						'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted dark:border-input dark:bg-input-fill',
					secondary:
						'bg-secondary text-secondary-foreground hover:bg-secondary-hover aria-expanded:bg-secondary',
					ghost: 'hover:bg-muted hover:text-foreground aria-expanded:bg-muted',
					link: 'text-primary underline-offset-4 hover:text-primary-hover hover:underline',
					tonal: 'border-border bg-muted text-foreground hover:bg-secondary'
				},
				size: {
					default: 'h-10 px-6',
					xs: 'h-6 gap-1 px-2 text-xs [&_svg:not([class*="size-"])]:size-3',
					sm: 'h-8 px-3 text-xs',
					lg: 'h-12 px-7',
					icon: 'size-10',
					'icon-xs': 'size-6 [&_svg:not([class*="size-"])]:size-3',
					'icon-sm': 'size-8',
					'icon-lg': 'size-12'
				}
			},
			compoundVariants: [{ variant: 'link', class: 'h-auto p-0' }],
			defaultVariants: { variant: 'default', size: 'default' }
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
		variant = 'default',
		size = 'default',
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
