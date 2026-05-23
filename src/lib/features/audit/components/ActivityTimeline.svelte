<script lang="ts">
	import { Button, Card, EmptyState, Skeleton } from '$ui';
	import { Activity, User, Building2, Shield, AlertCircle } from '$icons';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ActivityDto, ActivityListResponse } from '../schemas';

	/**
	 * ActivityTimeline — cursor-paginated vertical timeline of audit events.
	 *
	 * Props:
	 *   - data: the current ActivityListResponse from TanStack Query
	 *   - isPending: loading state (first fetch)
	 *   - isError: error state
	 *   - errorMessage: display message for error state
	 *   - onLoadMore: called when user clicks "Load more"; receives next_cursor
	 *   - isLoadingMore: true while the next page is fetching
	 *
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

	function relativeTime(iso: string): string {
		const ms = Date.now() - new Date(iso).getTime();
		const s = Math.floor(ms / 1000);
		if (s < 60) return `${s}s ago`;
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		return new Date(iso).toLocaleDateString();
	}

	/** Actor verb+target summary per event. */
	function summarise(ev: ActivityDto): string {
		const actor = ev.actor_display_name ?? 'System';
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
</script>

{#if isPending}
	<ol class="stack stack-tight" aria-busy="true" aria-label="Loading activity">
		{#each [0, 1, 2, 3, 4] as i (i)}
			<li>
				<Card.Root>
					<Card.Content class="grid grid-cols-[auto_1fr] gap-3">
						<Skeleton shape="circle" class="mt-0.5 h-8 w-8" />
						<div class="stack stack-tight min-w-0">
							<Skeleton class="h-4 w-3/4" />
							<Skeleton class="h-3 w-1/4" />
						</div>
					</Card.Content>
				</Card.Root>
			</li>
		{/each}
	</ol>
{:else if isError}
	<div class="stack stack-tight">
		<p class="body-sm text-danger-700">{errorMessage}</p>
	</div>
{:else if items.length === 0}
	<EmptyState icon={Activity} title="No activity" description="Nothing recorded yet." />
{:else}
	<ol class="stack stack-tight" aria-label="Activity timeline">
		{#each items as ev (ev.id)}
			{@const EventIcon = iconFor(ev.event_type)}
			{@const isExpanded = expanded.has(ev.id)}
			{@const hasPayload = Object.keys(ev.payload).length > 0}
			<li>
				<Card.Root>
					<Card.Content class="grid grid-cols-[auto_1fr] gap-3">
						<!-- Timeline dot + icon -->
						<span
							class="bg-bg-muted mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
							aria-hidden="true"
						>
							<EventIcon size={14} class="text-fg-muted" />
						</span>

						<div class="stack stack-tight min-w-0">
							<!-- Summary row: stacked on mobile, spread on md+ -->
							<div
								class="flex flex-col gap-1 md:flex-row md:items-center md:justify-between md:gap-2"
							>
								<p class="body-sm text-fg truncate font-medium">
									{summarise(ev)}
								</p>
								<time
									datetime={ev.occurred_at}
									class="caption text-fg-subtle flex-shrink-0"
									title={new Date(ev.occurred_at).toLocaleString()}
								>
									{relativeTime(ev.occurred_at)}
								</time>
							</div>

							<!-- Trace ID chip -->
							{#if ev.trace_id}
								<p class="caption text-fg-subtle font-mono">
									ref: {ev.trace_id}
								</p>
							{/if}

							<!-- Expandable payload -->
							{#if hasPayload}
								<button
									type="button"
									class="caption text-primary focus-visible:ring-focus-ring self-start hover:underline focus-visible:ring-2 focus-visible:outline-none"
									onclick={() => toggle(ev.id)}
									aria-expanded={isExpanded}
								>
									{isExpanded ? 'Hide' : 'Show'} details
								</button>
								{#if isExpanded}
									<pre
										class="body-xs bg-bg-muted text-fg-muted mt-1 overflow-x-auto rounded-md p-2">{JSON.stringify(
											ev.payload,
											null,
											2
										)}</pre>
								{/if}
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</li>
		{/each}
	</ol>

	{#if nextCursor && onLoadMore}
		<div class="flex justify-center pt-2">
			<Button variant="ghost" onclick={() => onLoadMore!(nextCursor)} loading={isLoadingMore}>
				Load more
			</Button>
		</div>
	{/if}
{/if}
