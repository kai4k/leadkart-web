<script lang="ts">
	/**
	 * CallLogTimeline — vertical event stream of CallLogDto items.
	 *
	 * Composes `<Timeline.Root>` / `<Timeline.Item>` from `$ui/timeline`.
	 * Each item's icon accent comes from the outcome → accent map in
	 * view-models so we don't render two different visual hierarchies.
	 */
	import { Timeline, Skeleton, EmptyState } from '$ui';
	import { Icon, Inbox, Phone } from '$icons';
	import type { CallLogDto } from '../schemas';
	import { CALL_OUTCOME_ACCENT, CALL_OUTCOME_LABEL, relativeTime } from '../view-models';

	type Props = {
		items: CallLogDto[];
		state: 'pending' | 'error' | 'empty' | 'ready';
	};

	let { items, state }: Props = $props();
</script>

{#if state === 'pending'}
	<div class="stack stack-tight">
		{#each [0, 1, 2] as i (i)}
			<Skeleton class="h-12 w-full rounded-md" />
		{/each}
	</div>
{:else if state === 'empty'}
	<EmptyState
		icon={Inbox}
		title="No calls logged"
		description="Use “Log call” to record outcomes and book callbacks."
	/>
{:else}
	<Timeline.Root data-testid="call-log-timeline">
		{#each items as call (call.id)}
			<Timeline.Item
				icon={Phone}
				iconAccent={CALL_OUTCOME_ACCENT[call.outcome]}
				title={CALL_OUTCOME_LABEL[call.outcome]}
				time={relativeTime(call.called_at)}
				datetime={call.called_at}
			>
				{#if call.notes}
					<p class="body-sm text-fg-muted">{call.notes}</p>
				{/if}
				{#if call.callback_at}
					<p class="caption text-fg-muted">
						Callback scheduled · {relativeTime(call.callback_at)}
					</p>
				{/if}
			</Timeline.Item>
		{/each}
	</Timeline.Root>
{/if}

<span class="hidden"><Icon icon={Inbox} size="xs" /></span>
