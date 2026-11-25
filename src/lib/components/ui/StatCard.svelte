<script lang="ts" module>
	/**
	 * StatCard: the KPI tile (spec KpiTile). A clay card holding an icon chip, a muted label, a 2xl semibold
	 * value, the ONE time frame the number is about (required: "now", "This month", "Today"), and optionally a
	 * comparison ("vs last month"), a hint and a delta chip ("+12.5% vs last week"). It is a description list,
	 * so the value is read together with its label and its time frame. Loading renders a matched-shape
	 * skeleton so layout does not shift when data arrives.
	 */

	import { type VariantProps, cva } from 'class-variance-authority';

	export const statCardAccentVariants = cva('', {
		variants: {
			// `primary` and `neutral` are identity (what a tile is). `warning` and `danger` are STATUS: only a tile that
			// counts something at risk (`warning`) or overdue (`danger`) takes them; a count is otherwise neutral.
			accent: {
				primary: 'text-primary-indicator bg-primary-soft',
				neutral: 'text-muted-foreground bg-muted',
				warning: 'text-warning bg-warning-soft',
				danger: 'text-destructive bg-destructive-soft'
			}
		},
		defaultVariants: { accent: 'neutral' }
	});

	export type StatCardAccent = NonNullable<VariantProps<typeof statCardAccentVariants>['accent']>;
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ArrowDown, ArrowUp, iconSize } from '#lib/icons/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import * as Card from './card';
	import { Skeleton } from './skeleton';

	type Props = {
		label: string;
		value: string | number;
		/** The one period the number is about, in words ("This month", "Today", "Right now"). */
		timeframe: string;
		/** What the number is set against ("vs last month"). */
		comparison?: string;
		/** One line under the value saying what it counts. */
		hint?: string;
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
		timeframe,
		comparison,
		hint,
		delta,
		icon: IconComp,
		loading = false,
		accent = 'neutral',
		class: className = ''
	}: Props = $props();

	// The app-wide empty value is the em dash: a muted dash that reads as words.
	const placeholder = $derived(value === '—');
	const trend = $derived(
		delta === undefined ? null : delta.value > 0 ? 'up' : delta.value < 0 ? 'down' : 'flat'
	);
	const deltaFormatted = $derived(
		delta ? `${delta.value > 0 ? '+' : ''}${delta.value.toFixed(1)}%` : ''
	);
</script>

<Card.Root padding="md" class={className} aria-busy={loading ? 'true' : undefined}>
	<div class="flex items-start justify-between gap-3">
		<dl class="stack stack-tight m-0 min-w-0 flex-1">
			<dt class="body-sm text-muted-foreground">{label}</dt>
			<dd class="m-0">
				{#if loading}
					<Skeleton class="h-8 w-24" />
				{:else if placeholder}
					<span
						class="text-subtle-foreground text-2xl font-semibold tabular-nums"
						aria-hidden="true">{value}</span
					>
					<span class="sr-only">{$_('statCard.noData')}</span>
				{:else}
					<span class="text-foreground text-2xl font-semibold tabular-nums break-words"
						>{value}</span
					>
				{/if}
			</dd>
			<dd class="caption m-0" data-slot="stat-timeframe">
				<span class="text-foreground font-semibold">{timeframe}</span>
				{#if comparison}<span class="text-muted-foreground"> · {comparison}</span>{/if}
			</dd>
			{#if hint}
				<dd class="caption text-subtle-foreground m-0">{hint}</dd>
			{/if}
			{#if loading}
				<dd class="m-0"><Skeleton class="h-4 w-32" /></dd>
			{:else if delta && trend}
				<dd class="m-0">
					<span
						data-trend={trend}
						class={cn(
							'caption inline-flex items-center gap-1 rounded-full px-2 py-0.5',
							trend === 'up' && 'bg-success-soft text-success',
							trend === 'down' && 'bg-destructive-soft text-destructive',
							trend === 'flat' && 'bg-muted text-muted-foreground'
						)}
					>
						{#if trend === 'up'}
							<ArrowUp size={iconSize('xs')} aria-hidden="true" />
						{:else if trend === 'down'}
							<ArrowDown size={iconSize('xs')} aria-hidden="true" />
						{/if}
						<span class="sr-only"
							>{trend === 'up'
								? $_('statCard.up')
								: trend === 'down'
									? $_('statCard.down')
									: $_('statCard.flat')}</span
						>
						<span class="tabular-nums">{deltaFormatted}</span>
						<span class="text-muted-foreground">{delta.period}</span>
					</span>
				</dd>
			{/if}
		</dl>
		{#if IconComp}
			<span
				data-accent={accent}
				class={cn(
					'inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
					statCardAccentVariants({ accent })
				)}
				aria-hidden="true"
			>
				<!-- IconComp is caller-supplied (typed `any`); pass the token-mapped pixel size so even
				     consumer-provided icons honour the icon-size scale. -->
				<IconComp size={iconSize('md')} />
			</span>
		{/if}
	</div>
</Card.Root>
