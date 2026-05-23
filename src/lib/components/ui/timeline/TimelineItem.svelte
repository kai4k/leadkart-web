<script lang="ts" module>
	import type { VariantProps } from 'class-variance-authority';
	import { cva } from 'class-variance-authority';

	export const timelineIconVariants = cva(
		[
			'relative z-[1] inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
			'ring-4 ring-bg-elevated'
		],
		{
			variants: {
				accent: {
					primary: 'bg-primary-soft text-primary border border-primary',
					success: 'bg-success-50 text-success-900 border border-success-500',
					warning: 'bg-warning-50 text-warning-900 border border-warning-500',
					danger: 'bg-danger-50 text-danger-900 border border-danger-500',
					info: 'bg-info-50 text-info-900 border border-info-500',
					neutral: 'bg-bg-muted text-fg-muted border border-border'
				}
			},
			defaultVariants: { accent: 'neutral' }
		}
	);

	export type TimelineItemAccent = NonNullable<VariantProps<typeof timelineIconVariants>['accent']>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

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
						iconAccent === 'success' && 'bg-success-500',
						iconAccent === 'warning' && 'bg-warning-500',
						iconAccent === 'danger' && 'bg-danger-500',
						iconAccent === 'info' && 'bg-info-500',
						iconAccent === 'neutral' && 'bg-fg-subtle'
					)}
				></span>
			{/if}
		</span>

		<div class="stack stack-tight min-w-0 flex-1 pb-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<p class="body-sm text-fg font-medium">{title}</p>
				{#if time}
					<time class="caption text-fg-muted tabular-nums" datetime={datetime ?? undefined}
						>{time}</time
					>
				{/if}
			</div>
			{#if description}
				<p class="body-sm text-fg-muted">{description}</p>
			{/if}
			{#if children}
				<div class="body-sm text-fg-muted">{@render children()}</div>
			{/if}
		</div>
	</div>
</li>
