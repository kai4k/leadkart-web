<script lang="ts" module>
	/**
	 * Button — shadcn-svelte canonical structure (data-slot, $bindable ref,
	 * tv variants) carrying the LeadKart variant set. Six variants:
	 *
	 *   primary    — solid logo purple, Material 3 state-layer hover/active
	 *   secondary  — vibrant logo green gradient (growth CTAs)
	 *   tonal      — quiet neutral on muted surface
	 *   ghost      — text-only, hover bg
	 *   danger     — system red gradient (destructive confirms)
	 *   glass      — frosted Liquid Glass overlay (heroes, image-backed)
	 *   link       — pure text, underline-on-hover
	 *
	 * Sizes: sm (h-9) / md (h-11, Apple HIG 44px floor) / lg (h-12,
	 * Material 3 48px floor) / icon (h-11 square).
	 *
	 * `loading` swaps the leading affordance to a Spinner + sets aria-busy.
	 * `fullWidth` stretches to 100% — common in form footers / mobile.
	 *
	 * Industry refs: shadcn-svelte Button, Radix Button, Material 3 button
	 * hierarchy (filled / tonal / outlined / text).
	 */
	import { type VariantProps, tv } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: [
			'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
			'interactive',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
			'disabled:cursor-not-allowed disabled:opacity-60 disabled:!transform-none',
			'motion-reduce:!transition-none motion-reduce:!transform-none motion-reduce:hover:!transform-none'
		],
		variants: {
			variant: {
				// LeadKart-named variants
				primary:
					'relative overflow-hidden bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active brand-halo glass-sheen',
				secondary:
					'bg-gradient-to-b from-secondary-700 to-secondary-900 text-white hover:from-secondary-600 hover:to-secondary-800 shadow-[var(--shadow-secondary)]',
				tonal: 'bg-bg-muted text-fg hover:bg-bg-subtle border border-border',
				ghost: 'text-fg hover:bg-bg-muted',
				danger:
					'bg-gradient-to-b from-danger-500 to-danger-700 text-fg-on-brand hover:from-danger-400 hover:to-danger-600 shadow-[var(--shadow-danger)]',
				glass:
					'relative overflow-hidden glass-popover glass-sheen text-fg hover:text-primary-hover',
				link: '!transform-none hover:!transform-none active:!transform-none text-primary underline-offset-4 hover:underline hover:text-primary-hover p-0 h-auto',
				// shadcn-canonical aliases — generated subcomponents (alert-dialog
				// action/cancel, sheet/dialog close, carousel previous/next) pass
				// these names; mapped onto our LeadKart visuals.
				default:
					'relative overflow-hidden bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active brand-halo glass-sheen',
				outline: 'bg-bg-muted text-fg hover:bg-bg-subtle border border-border',
				destructive:
					'bg-gradient-to-b from-danger-500 to-danger-700 text-fg-on-brand hover:from-danger-400 hover:to-danger-600 shadow-[var(--shadow-danger)]'
			},
			size: {
				// LeadKart-named sizes
				sm: 'h-9 px-3 body-sm',
				md: 'h-11 px-4 body-sm',
				lg: 'h-12 px-5 body-base',
				icon: 'h-11 w-11 p-0',
				// shadcn-canonical aliases
				default: 'h-11 px-4 body-sm',
				xs: 'h-7 px-2 text-xs',
				'icon-xs': 'h-7 w-7 p-0',
				'icon-sm': 'h-9 w-9 p-0',
				'icon-lg': 'h-12 w-12 p-0'
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
	});

	export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
	export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;
	export type ButtonVariants = VariantProps<typeof buttonVariants>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn, resolveHref, type WithElementRef } from '$lib/utils/cn';
	import Spinner from '../Spinner.svelte';

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> &
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
		href = undefined,
		ref = $bindable(null),
		class: className = '',
		children,
		...rest
	}: ButtonProps = $props();
</script>

{#if href}
	<!--
		Note: the svelte/no-navigation-without-resolve rule wants a literal
		`resolve()` call at the href attribute. `resolveHref()` wraps
		`resolve()` with external-URL detection so atoms can accept any
		string prop safely. The rule's lexical check doesn't unwrap the
		helper — flag is a known wrapper-pattern limitation; the helper
		IS canonical-equivalent + handles externals (http, //, mailto:, #).
	-->
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size, fullWidth }), className)}
		href={disabled || loading ? undefined : resolveHref(href)}
		aria-disabled={disabled || loading}
		role={disabled || loading ? 'link' : undefined}
		tabindex={disabled || loading ? -1 : undefined}
		aria-busy={loading || undefined}
		{...rest}
	>
		{#if loading}
			<Spinner size={size === 'lg' ? 18 : 16} aria-hidden="true" />
		{/if}
		{#if children}{@render children()}{/if}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		{type}
		disabled={disabled || loading}
		aria-busy={loading || undefined}
		class={cn(buttonVariants({ variant, size, fullWidth }), className)}
		{...rest}
	>
		{#if loading}
			<Spinner size={size === 'lg' ? 18 : 16} aria-hidden="true" />
		{/if}
		{#if children}{@render children()}{/if}
	</button>
{/if}
