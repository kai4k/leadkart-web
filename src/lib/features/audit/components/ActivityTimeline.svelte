<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Button, EmptyState, Skeleton, Timeline, type TimelineItemAccent } from '$ui';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { Activity, User, Building2, Shield, AlertCircle } from '$icons';
	import { ApiError } from '$api/errors';
	import { relativeTime } from '#lib/utils/format.ts';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ActivityDto, ActivityListResponse } from '../schemas';

	/**
	 * ActivityTimeline — cursor-paginated vertical timeline of audit events.
	 *
	 * Props:
	 *   - data: the current ActivityListResponse from TanStack Query
	 *   - isPending: loading state (first fetch)
	 *   - isError: error state
	 *   - errorMessage: the line shown when the load failed
	 *   - onLoadMore: called when user clicks "Load more"; receives next_cursor
	 *   - isLoadingMore: true while the next page is fetching
	 *
	 * Loading, failure and empty come from `QueryState`; the events are `ui/timeline` items.
	 * Design canon: Linear audit-log / GitHub timeline — icon + actor verb + target,
	 * timestamp, expandable payload, trace ID chip.
	 */

	type Props = {
		data?: ActivityListResponse | null;
		isPending?: boolean;
		isError?: boolean;
		errorMessage?: string;
		onLoadMore?: (cursor: string) => void;
		isLoadingMore?: boolean;
	};

	let {
		data = null,
		isPending = false,
		isError = false,
		errorMessage = 'Failed to load activity',
		onLoadMore,
		isLoadingMore = false
	}: Props = $props();

	/** Per-event_type icon mapping — falls back to Activity. */
	const EVENT_ICONS: Record<string, typeof Activity> = {
		'tenant.created': Building2,
		'tenant.activated': Building2,
		'tenant.suspended': AlertCircle,
		'tenant.restored': Building2,
		'tenant.marked_for_deletion': AlertCircle,
		'user.created': User,
		'user.deactivated': User,
		'user.reactivated': User,
		'user.role_assigned': Shield,
		'user.role_revoked': Shield,
		'person.globally_suspended': AlertCircle,
		'person.suspension_lifted': User,
		'person.anonymised': User
	};

	function iconFor(eventType: string): typeof Activity {
		return EVENT_ICONS[eventType] ?? Activity;
	}

	/** Suspensions and deletions are drawn as warnings; everything else is neutral. */
	function accentFor(eventType: string): TimelineItemAccent {
		return EVENT_ICONS[eventType] === AlertCircle ? 'warning' : 'neutral';
	}

	/** Actor verb+target summary per event. */
	function summarise(ev: ActivityDto): string {
		const actor = ev.actor_display_name ?? $_('audit.timeline.system');
		const type = ev.event_type.replace(/_/g, ' ');
		const target = ev.target_id ? ` · ${ev.target_type ?? ''} ${ev.target_id.slice(0, 8)}…` : '';
		return `${actor} · ${type}${target}`;
	}

	/** Expandable payload state per event ID. */
	let expanded = new SvelteSet<string>();

	function toggle(id: string) {
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
	}

	const items = $derived(data?.items ?? []);
	const nextCursor = $derived(data?.next_cursor ?? null);

	// The page hands in the pieces of its query; QueryState reads the same shape. A failure is
	// the caller's line, shown as-is (an `ApiError` with no status carries its own message).
	const query = $derived({
		isPending,
		isError,
		error: isError ? Object.assign(new ApiError(), { message: errorMessage }) : null,
		data: data ?? undefined
	});
</script>

<QueryState {query} noun={$_('audit.timeline.noun')} isEmpty={(d) => d.items.length === 0}>
	{#snippet empty()}
		<EmptyState
			icon={Activity}
			title={$_('audit.timeline.emptyTitle')}
			description={$_('audit.timeline.emptyDescription')}
		/>
	{/snippet}
	{#snippet skeleton()}
		<div class="stack stack-tight" aria-hidden="true">
			{#each [0, 1, 2, 3, 4] as i (i)}
				<div class="grid grid-cols-[auto_1fr] gap-3">
					<Skeleton shape="circle" class="h-8 w-8" />
					<div class="stack stack-tight min-w-0">
						<Skeleton class="h-4 w-3/4" />
						<Skeleton class="h-3 w-1/4" />
					</div>
				</div>
			{/each}
		</div>
	{/snippet}
	<Timeline.Root aria-label={$_('audit.timeline.label')}>
		{#each items as ev (ev.id)}
			{@const isExpanded = expanded.has(ev.id)}
			<Timeline.Item
				icon={iconFor(ev.event_type)}
				iconAccent={accentFor(ev.event_type)}
				title={summarise(ev)}
				time={relativeTime(ev.occurred_at)}
				datetime={ev.occurred_at}
			>
				{#if ev.trace_id}
					<p class="caption text-subtle-foreground font-mono">ref: {ev.trace_id}</p>
				{/if}
				{#if Object.keys(ev.payload).length > 0}
					<button
						type="button"
						class="caption text-primary-text focus-visible:ring-ring self-start hover:underline focus-visible:ring-2 focus-visible:outline-none"
						onclick={() => toggle(ev.id)}
						aria-expanded={isExpanded}
					>
						{isExpanded ? $_('audit.timeline.hideDetails') : $_('audit.timeline.showDetails')}
					</button>
					{#if isExpanded}
						<pre
							class="body-xs bg-muted text-muted-foreground mt-1 overflow-x-auto rounded-md p-2">{JSON.stringify(
								ev.payload,
								null,
								2
							)}</pre>
					{/if}
				{/if}
			</Timeline.Item>
		{/each}
	</Timeline.Root>

	{#if nextCursor && onLoadMore}
		{@const loadMore = onLoadMore}
		{@const cursor = nextCursor}
		<div class="flex justify-center pt-2">
			<Button variant="ghost" onclick={() => loadMore(cursor)} loading={isLoadingMore}>
				{$_('audit.timeline.loadMore')}
			</Button>
		</div>
	{/if}
</QueryState>
