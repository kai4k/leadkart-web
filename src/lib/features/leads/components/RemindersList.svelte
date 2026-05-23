<script lang="ts">
	/**
	 * RemindersList — pending reminders for a lead, grouped by overdue /
	 * today / upcoming.
	 *
	 * Each row exposes complete / snooze / dismiss actions wired to
	 * updateReminderMutation.
	 */
	import { Card, Badge, Button, Skeleton, EmptyState } from '$ui';
	import { Icon, Bell, Check, Pause, X } from '$icons';
	import type { ReminderDto } from '../schemas';
	import { REMINDER_KIND_LABEL, relativeTime } from '../view-models';
	import { updateReminderMutation } from '../queries';

	type Props = {
		leadId: string;
		items: ReminderDto[];
		state: 'pending' | 'error' | 'empty' | 'ready';
	};

	let { leadId, items, state }: Props = $props();

	const mutation = updateReminderMutation();

	const DAY_MS = 86_400_000;

	function classify(r: ReminderDto, now = Date.now()): 'overdue' | 'today' | 'upcoming' {
		const due = new Date(r.due_at).getTime();
		if (due < now) return 'overdue';
		// End-of-today as ms-from-epoch without mutating a Date instance —
		// avoid SvelteDate vs JS-Date lint friction.
		const startOfToday = now - (now % DAY_MS);
		const endOfToday = startOfToday + DAY_MS - 1;
		if (due <= endOfToday) return 'today';
		return 'upcoming';
	}

	const groups = $derived(() => {
		const buckets: Record<'overdue' | 'today' | 'upcoming', ReminderDto[]> = {
			overdue: [],
			today: [],
			upcoming: []
		};
		for (const r of items) buckets[classify(r)].push(r);
		return buckets;
	});

	function act(r: ReminderDto, action: 'complete' | 'dismiss' | 'snooze') {
		mutation.mutate({ id: r.id, leadId, action });
	}
</script>

{#if state === 'pending'}
	<div class="stack stack-tight">
		{#each [0, 1] as i (i)}
			<Skeleton class="h-16 w-full rounded-md" />
		{/each}
	</div>
{:else if state === 'empty'}
	<EmptyState
		icon={Bell}
		title="No reminders"
		description="Schedule a callback or a manual reminder during call logging."
	/>
{:else}
	{@const g = groups()}
	<div class="stack stack-relaxed">
		{#each [{ key: 'overdue' as const, label: 'Overdue', variant: 'danger' as const }, { key: 'today' as const, label: 'Today', variant: 'warning' as const }, { key: 'upcoming' as const, label: 'Upcoming', variant: 'info' as const }] as group (group.key)}
			{#if g[group.key].length > 0}
				<div class="stack stack-tight">
					<div class="cluster cluster-tight">
						<h4 class="label text-fg">{group.label}</h4>
						<Badge variant={group.variant} style="soft" size="sm">{g[group.key].length}</Badge>
					</div>
					{#each g[group.key] as r (r.id)}
						<Card.Root>
							<Card.Content>
								<div class="cluster cluster-spread items-start">
									<div class="stack stack-tight min-w-0">
										<div class="cluster cluster-tight">
											<Icon icon={Bell} size="xs" />
											<span class="label text-fg">{REMINDER_KIND_LABEL[r.kind]}</span>
											<span class="caption text-fg-muted">· {relativeTime(r.due_at)}</span>
										</div>
										{#if r.note}
											<p class="body-sm text-fg-muted">{r.note}</p>
										{/if}
									</div>
									<div class="cluster cluster-tight">
										<Button size="sm" variant="tonal" onclick={() => act(r, 'snooze')}>
											<Icon icon={Pause} size="xs" /> Snooze
										</Button>
										<Button size="sm" variant="ghost" onclick={() => act(r, 'dismiss')}>
											<Icon icon={X} size="xs" /> Dismiss
										</Button>
										<Button size="sm" onclick={() => act(r, 'complete')}>
											<Icon icon={Check} size="xs" /> Complete
										</Button>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		{/each}
	</div>
{/if}
