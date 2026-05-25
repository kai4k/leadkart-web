<script lang="ts">
	/**
	 * ReassignmentHistory — vertical timeline of AssignmentHistory rows.
	 * Each entry shows the membership transition + reason. The membership
	 * UUIDs aren't humanised yet (no name-resolution endpoint); they're
	 * rendered as short hashes pending the directory API.
	 */
	import { Timeline, Skeleton, EmptyState } from '$ui';
	import { Icon, UserCheck } from '$icons';
	import type { AssignmentHistoryDto } from '../schemas';
	import { relativeTime } from '../view-models';

	type Props = {
		items: AssignmentHistoryDto[];
		state: 'pending' | 'error' | 'empty' | 'ready';
	};

	let { items, state }: Props = $props();

	function shorten(id: string | null | undefined): string {
		if (!id) return '—';
		return id.length > 8 ? `…${id.slice(-8)}` : id;
	}
</script>

{#if state === 'pending'}
	<div class="stack stack-tight">
		{#each [0, 1] as i (i)}
			<Skeleton class="h-12 w-full rounded-md" />
		{/each}
	</div>
{:else if state === 'empty'}
	<EmptyState
		icon={UserCheck}
		title="No reassignments"
		description="The lead has only had its original owner."
	/>
{:else}
	<Timeline.Root data-testid="assignment-history-timeline">
		{#each items as h (h.id)}
			<Timeline.Item
				icon={UserCheck}
				iconAccent="primary"
				title={`Reassigned · ${shorten(h.from_membership_id)} → ${shorten(h.to_membership_id)}`}
				time={relativeTime(h.assigned_at)}
				datetime={h.assigned_at}
			>
				{#if h.reason}
					<p class="body-sm text-fg-muted">{h.reason}</p>
				{/if}
				<p class="caption text-fg-subtle">By {shorten(h.assigned_by_membership_id)}</p>
			</Timeline.Item>
		{/each}
	</Timeline.Root>
{/if}

<span class="hidden"><Icon icon={UserCheck} size="xs" /></span>
