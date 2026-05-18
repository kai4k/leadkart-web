<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const skeletonVariants = cva('block animate-shimmer bg-bg-muted', {
		variants: {
			shape: {
				line: 'rounded',
				circle: 'rounded-full',
				rect: 'rounded-md'
			}
		},
		defaultVariants: {
			shape: 'line'
		}
	});
	export type SkeletonVariants = VariantProps<typeof skeletonVariants>;
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';

	type Props = SkeletonVariants & {
		/**
		 * Additional Tailwind classes — use to set width (e.g. 'w-24') and
		 * height (e.g. 'h-4'). Width is required; height defaults to h-4
		 * for line shape when not overridden.
		 */
		class?: string;
	};

	let { shape = 'line', class: className = '' }: Props = $props();
</script>

<span class={cn(skeletonVariants({ shape }), 'h-4', className)} aria-hidden="true"></span>
