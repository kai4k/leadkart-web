<!-- src/lib/components/ui/progress/Progress.svelte -->
<!--
	Progress — determinate / indeterminate progress bar.

	bits-ui Progress.Root sets the ARIA progressbar role + aria-valuemin
	/ aria-valuemax / aria-valuenow / data-state attributes. We render
	the visual track + indicator inside.

	Variants:
	  - primary (default) — brand purple fill, generic use.
	  - success           — green fill, "done/positive" semantics.
	  - warning           — orange fill, "attention" semantics.
	  - danger            — red fill, "over budget / overdue" semantics.

	Pass `label` for a screen-reader-only aria-label; for visible labels,
	wrap the Progress in a labelled container instead.
-->
<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const progressIndicatorVariants = cva(
		[
			'h-full rounded-full',
			'transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out)]'
		],
		{
			variants: {
				variant: {
					primary: 'bg-primary',
					success: 'bg-success-500',
					warning: 'bg-warning-500',
					danger: 'bg-danger-500'
				}
			},
			defaultVariants: { variant: 'primary' }
		}
	);

	export type ProgressVariants = VariantProps<typeof progressIndicatorVariants>;
</script>

<script lang="ts">
	import { Progress as BitsProgress } from 'bits-ui';
	import { cn } from '$lib/utils/cn';

	type Props = {
		value?: number | null;
		max?: number;
		min?: number;
		variant?: NonNullable<ProgressVariants['variant']>;
		label?: string;
		class?: string;
	};

	let {
		value = 0,
		max = 100,
		min = 0,
		variant = 'primary',
		label,
		class: className = ''
	}: Props = $props();

	const pct = $derived(
		value === null || value === undefined ? null : ((value - min) / (max - min)) * 100
	);
</script>

<BitsProgress.Root
	{value}
	{max}
	{min}
	aria-label={label}
	class={cn('bg-bg-muted relative h-2 w-full overflow-hidden rounded-full', className)}
>
	{#if pct === null}
		<!-- Indeterminate state — animated sliver crossing the track. -->
		<div
			class={cn(
				progressIndicatorVariants({ variant }),
				'animate-pulse-soft absolute inset-y-0 w-1/3'
			)}
		></div>
	{:else}
		<div
			class={cn(progressIndicatorVariants({ variant }))}
			style:width="{Math.min(100, Math.max(0, pct))}%"
		></div>
	{/if}
</BitsProgress.Root>
