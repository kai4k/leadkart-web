<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	export const buttonVariants = cva(
		[
			'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
			'interactive',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
			'disabled:cursor-not-allowed disabled:opacity-60 disabled:!transform-none',
			'motion-reduce:!transition-none motion-reduce:!transform-none motion-reduce:hover:!transform-none'
		],
		{
			variants: {
				variant: {
					primary:
						'relative overflow-hidden bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active  ',
					secondary:
						'bg-gradient-to-b from-secondary-700 to-secondary-900 text-white hover:from-secondary-600 hover:to-secondary-800 shadow-[var(--shadow-secondary)]',
					tonal: 'bg-bg-muted text-fg hover:bg-bg-subtle border border-border',
					ghost: 'text-fg hover:bg-bg-muted',
					danger:
						'bg-gradient-to-b from-danger-500 to-danger-700 text-fg-on-brand hover:from-danger-400 hover:to-danger-600 shadow-[var(--shadow-danger)]',
					glass:
						'relative overflow-hidden bg-bg-elevated border border-border rounded-md shadow-md  text-fg hover:text-primary-hover',
					link: '!transform-none hover:!transform-none active:!transform-none text-primary underline-offset-4 hover:underline hover:text-primary-hover p-0 h-auto',
					default:
						'relative overflow-hidden bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active  ',
					outline: 'bg-bg-muted text-fg hover:bg-bg-subtle border border-border',
					destructive:
						'bg-gradient-to-b from-danger-500 to-danger-700 text-fg-on-brand hover:from-danger-400 hover:to-danger-600 shadow-[var(--shadow-danger)]'
				},
				size: {
					sm: 'h-9 px-3 body-sm',
					md: 'h-11 px-4 body-sm',
					lg: 'h-12 px-5 body-base',
					icon: 'h-11 w-11 p-0',
					default: 'h-11 px-4 body-sm',
					xs: 'h-7 px-2 text-xs',
					'icon-xs': 'h-7 w-7 p-0',
					'icon-sm': 'h-9 w-9 p-0',
					'icon-lg': 'h-12 w-12 p-0'
				},
				fullWidth: { true: 'w-full', false: '' }
			},
			defaultVariants: { variant: 'primary', size: 'md', fullWidth: false }
		}
	);

	export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
	export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;
	export type ButtonVariants = VariantProps<typeof buttonVariants>;
</script>

<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { resolve } from '$app/paths';
	import { cn, type WithElementRef } from '$lib/utils/cn';
	import Spinner from '../spinner/Spinner.svelte';

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> &
		ButtonVariants & { loading?: boolean; children?: Snippet };

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

	const forwardRef: Attachment = (node) => {
		ref = node as HTMLAnchorElement & HTMLButtonElement;
		return () => {
			ref = null;
		};
	};
</script>

{#if href}
	<a
		{@attach forwardRef}
		data-slot="button"
		class={cn(buttonVariants({ variant, size, fullWidth }), className)}
		href={disabled || loading || !href ? undefined : (resolve as (h: string) => string)(href)}
		aria-disabled={disabled || loading}
		role={disabled || loading ? 'link' : undefined}
		tabindex={disabled || loading ? -1 : undefined}
		aria-busy={loading || undefined}
		{...rest}
	>
		{#if loading}<Spinner size={size === 'lg' ? 18 : 16} aria-hidden="true" />{/if}
		{#if children}{@render children()}{/if}
	</a>
{:else}
	<button
		{@attach forwardRef}
		data-slot="button"
		{type}
		disabled={disabled || loading}
		aria-busy={loading || undefined}
		class={cn(buttonVariants({ variant, size, fullWidth }), className)}
		{...rest}
	>
		{#if loading}<Spinner size={size === 'lg' ? 18 : 16} aria-hidden="true" />{/if}
		{#if children}{@render children()}{/if}
	</button>
{/if}
