<script lang="ts" module>
	import { type VariantProps, cva } from 'class-variance-authority';

	export const timelineIconVariants = cva(
		[
			'relative z-[1] inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
			'ring-4 ring-card'
		],
		{
			variants: {
				accent: {
					primary: 'bg-primary-soft text-primary-text border border-primary',
					success: 'bg-success-soft text-success border border-success',
					warning: 'bg-warning-soft text-warning border border-warning',
					danger: 'bg-destructive-soft text-destructive border border-destructive',
					info: 'bg-info-soft text-info border border-info',
					neutral: 'bg-muted text-muted-foreground border border-border'
				}
			},
			defaultVariants: { accent: 'neutral' }
		}
	);

	export type TimelineItemAccent = NonNullable<VariantProps<typeof timelineIconVariants>['accent']>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils/cn.ts';

	type Props = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
		iconAccent?: TimelineItemAccent;
		time?: string;
		/** Machine-readable ISO 8601 datetime — emitted as the <time datetime=…> attr for AT parseability. */
		datetime?: string;
		title: string;
		description?: string;
		class?: string;
		children?: Snippet;
	};

	let {
		icon: IconComp,
		iconAccent = 'neutral',
		time,
		datetime,
		title,
		description,
		class: className = '',
		children
	}: Props = $props();
</script>

<li class={cn('timeline-item', className)}>
	<div class="flex items-start gap-3">
		<span class={cn(timelineIconVariants({ accent: iconAccent }))} aria-hidden="true">
			{#if IconComp}
				<IconComp size={16} />
			{:else}
				<span
					class={cn(
						'block h-2 w-2 rounded-full',
						iconAccent === 'primary' && 'bg-primary',
						iconAccent === 'success' && 'bg-success-indicator',
						iconAccent === 'warning' && 'bg-warning-indicator',
						iconAccent === 'danger' && 'bg-destructive-indicator',
						iconAccent === 'info' && 'bg-info-indicator',
						iconAccent === 'neutral' && 'bg-subtle-foreground'
					)}
				></span>
			{/if}
		</span>

		<div class="stack stack-tight min-w-0 flex-1 pb-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<p class="body-sm text-foreground font-medium">{title}</p>
				{#if time}
					<time class="caption text-muted-foreground tabular-nums" datetime={datetime ?? undefined}
						>{time}</time
					>
				{/if}
			</div>
			{#if description}
				<p class="body-sm text-muted-foreground">{description}</p>
			{/if}
			{#if children}
				<div class="body-sm text-muted-foreground">{@render children()}</div>
			{/if}
		</div>
	</div>
</li>
