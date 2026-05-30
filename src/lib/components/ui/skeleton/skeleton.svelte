<script lang="ts" module>
	/**
	 * Skeleton — shimmer placeholder. Lifted from legacy Skeleton.svelte
	 * into shadcn-canon dir layout. Shape variants: line / circle / rect.
	 * Default `h-4` for line shape; consumers override via `class`.
	 */
	import { type VariantProps, tv } from 'tailwind-variants';

	export const skeletonVariants = tv({
		base: 'animate-shimmer bg-bg-muted block',
		variants: {
			shape: {
				line: 'rounded',
				circle: 'rounded-full',
				rect: 'rounded-md'
			}
		},
		defaultVariants: { shape: 'line' }
	});

	export type SkeletonShape = NonNullable<VariantProps<typeof skeletonVariants>['shape']>;
	export type SkeletonVariants = VariantProps<typeof skeletonVariants>;
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils/cn';

	type Props = WithoutChildren<WithElementRef<HTMLAttributes<HTMLSpanElement>>> & SkeletonVariants;

	let { ref = $bindable(null), shape = 'line', class: className = '', ...rest }: Props = $props();
</script>

<span
	bind:this={ref}
	data-slot="skeleton"
	class={cn(skeletonVariants({ shape }), 'h-4', className)}
	aria-hidden="true"
	{...rest}
></span>
