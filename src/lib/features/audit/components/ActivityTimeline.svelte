<script lang="ts">
	import { _ } from 'svelte-i18n';
	import {
		Badge,
		Button,
		EmptyState,
		Skeleton,
		Timeline,
		type TimelineItemAccent
	} from '#lib/components/ui/index.ts';
	import { QueryState, type QueryLike } from '#lib/components/feedback/index.ts';
	import { Activity, User, Building2, Shield, AlertCircle } from '#lib/icons/index.ts';
	import { relativeTime } from '#lib/utils/format.ts';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ActivityDto, ActivityListResponse } from '../schemas';

	/**
	 * ActivityTimeline — cursor-paginated vertical timeline of audit events.
	 *
	 * Props:
	 *   - query: the activity query itself (the caller creates it). `QueryState` reads it whole, so a
	 *     failure offers "Try again", a 403 or 404 is an answer (a warning, nothing to retry), and a
	 *     failed background refetch that may pass keeps the loaded events on screen.
	 *   - onLoadMore: called when user clicks "Load more"; receives next_cursor
	 *   - isLoadingMore: true while the next page is fetching
	 *
	 * The events are `ui/timeline` items. Design canon: Linear audit-log / GitHub timeline: icon,
	 * what happened, when, expandable payload, reference.
	 */

	type Props = {
		query: QueryLike<ActivityListResponse>;
		onLoadMore?: (cursor: string) => void;
		isLoadingMore?: boolean;
	};

	let { query, onLoadMore, isLoadingMore = false }: Props = $props();

	/** Per-event_type icon mapping — falls back to Activity. */
	const EVENT_ICONS: Record<string, typeof Activity> = {
		'tenant.created': Building2,
		'tenant.activated': Building2,
		'tenant.suspended': AlertCircle,
		'user.created': User,
		'user.deactivated': User,
		'user.reactivated': User,
		'user.role_assigned': Shield,
		'user.role_revoked': Shield,
		'person.globally_suspended': AlertCircle,
		'person.suspension_lifted': User
	};

	function iconFor(eventType: string): typeof Activity {
		return EVENT_ICONS[eventType] ?? Activity;
	}

	/** Suspensions are drawn as warnings; everything else is neutral. */
	function accentFor(eventType: string): TimelineItemAccent {
		return EVENT_ICONS[eventType] === AlertCircle ? 'warning' : 'neutral';
	}

	/**
	 * What happened. No actor is named: Go does not record one for every event yet, and "System" for a
	 * suspension a person performed would be a false statement.
	 */
	function summarise(ev: ActivityDto): string {
		return ev.event_type.replace(/_/g, ' ');
	}

	/** Expandable payload state per event ID. */
	let expanded = new SvelteSet<string>();

	function toggle(id: string) {
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);
	}

	const items = $derived(query.data?.items ?? []);
	const nextCursor = $derived(query.data?.next_cursor ?? null);
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
				{#if !ev.succeeded}
					<!-- recorded, and it did not happen: an audit reader must not take a refused command for a change. Go's own error text is not shown: it can name a table or a constraint. -->
					<p class="caption cluster cluster-tight">
						<Badge variant="danger" size="sm">{$_('audit.timeline.failed')}</Badge>
					</p>
				{/if}
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

	{#if nextCursor && !onLoadMore}
		<p class="caption text-muted-foreground pt-2 text-center">
			{$_('audit.timeline.latestOnly', { values: { count: items.length } })}
		</p>
	{/if}

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
