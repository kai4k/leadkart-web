<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const cardVariants = cva(
		['rounded-lg border bg-[var(--color-bg-elevated)] border-[var(--color-border)]'],
		{
			variants: {
				padding: {
					none: '',
					sm: 'p-3',
					md: 'p-4',
					lg: 'p-6'
				},
				elevation: {
					none: '',
					sm: 'shadow-sm',
					md: 'shadow',
					lg: 'shadow-md'
				}
			},
			defaultVariants: { padding: 'none', elevation: 'none' }
		}
	);

	export type CardVariants = VariantProps<typeof cardVariants>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils/cn';

	type Props = HTMLAttributes<HTMLDivElement> &
		CardVariants & {
			children?: Snippet;
		};

	let {
		padding = 'none',
		elevation = 'none',
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

<div class={cn(cardVariants({ padding, elevation }), className)} {...rest}>
	{#if children}{@render children()}{/if}
</div>
