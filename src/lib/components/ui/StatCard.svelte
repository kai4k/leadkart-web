<script lang="ts" module>
	/**
	 * StatCard — KPI tile with optional trend chip.
	 *
	 * Industry refs: Stripe Dashboard MRR card, Linear analytics tiles,
	 * Vercel Project Metrics. A small label + display-2 value + optional
	 * delta chip ("+12.5% vs last week"). Loading state renders a
	 * matched-shape skeleton so layout doesn't shift on data arrival.
	 */

	import type { VariantProps } from 'class-variance-authority';
	import { cva } from 'class-variance-authority';

	export const statCardAccentVariants = cva('', {
		variants: {
			accent: {
				primary: 'text-primary bg-primary-soft',
				success: 'text-success-900 bg-success-50',
				warning: 'text-warning-900 bg-warning-50',
				danger: 'text-danger-900 bg-danger-50',
				info: 'text-info-900 bg-info-50',
				neutral: 'text-fg-muted bg-bg-muted'
			}
		},
		defaultVariants: { accent: 'neutral' }
	});

	export type StatCardAccent = NonNullable<VariantProps<typeof statCardAccentVariants>['accent']>;
</script>

<script lang="ts">
	import { ArrowDown, ArrowUp } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import * as Card from './card';
	import Skeleton from './Skeleton.svelte';

	type Props = {
		label: string;
		value: string | number;
		delta?: { value: number; period: string };
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
		loading?: boolean;
		accent?: StatCardAccent;
		class?: string;
	};

	let {
		label,
		value,
		delta,
		icon: IconComp,
		loading = false,
		accent = 'neutral',
		class: className = ''
	}: Props = $props();

	const deltaPositive = $derived(delta !== undefined && delta.value > 0);
	const deltaNegative = $derived(delta !== undefined && delta.value < 0);
	const deltaFormatted = $derived.by(() => {
		if (!delta) return '';
		const sign = delta.value > 0 ? '+' : '';
		return `${sign}${delta.value.toFixed(1)}%`;
	});
</script>

<Card.Root surface="solid" padding="md" class={className}>
	<div class="flex items-start justify-between gap-3">
		<div class="stack stack-tight min-w-0 flex-1">
			<p class="caption text-fg-muted overline">{label}</p>
			{#if loading}
				<Skeleton class="h-8 w-24" />
			{:else}
				<p class="display-2 text-fg break-words tabular-nums">{value}</p>
			{/if}
			{#if delta && !loading}
				<span
					class={cn(
						'caption inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5',
						deltaPositive && 'bg-success-50 text-success-900',
						deltaNegative && 'bg-danger-50 text-danger-900',
						!deltaPositive && !deltaNegative && 'bg-bg-muted text-fg-muted'
					)}
				>
					{#if deltaPositive}
						<ArrowUp size={12} aria-hidden="true" />
					{:else if deltaNegative}
						<ArrowDown size={12} aria-hidden="true" />
					{/if}
					<span class="tabular-nums">{deltaFormatted}</span>
					<span class="text-fg-muted">{delta.period}</span>
				</span>
			{:else if loading}
				<Skeleton class="h-4 w-32" />
			{/if}
		</div>
		{#if IconComp}
			<span
				class={cn(
					'inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
					statCardAccentVariants({ accent })
				)}
				aria-hidden="true"
			>
				<IconComp size={20} />
			</span>
		{/if}
	</div>
</Card.Root>
