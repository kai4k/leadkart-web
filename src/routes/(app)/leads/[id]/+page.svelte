<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import { ACTION, session } from '#lib/features/auth/index.ts';
	/**
	 * Lead detail page — header strip + tabs (Profile / Activity /
	 * Reminders / History).
	 *
	 * Composition only: every section is its own component, every fetch
	 * goes through TanStack hooks, every mutation lives in `queries.ts`.
	 */
	import { page } from '$app/state';
	import { Tabs, Skeleton, Button } from '#lib/components/ui/index.ts';
	import { Icon, Plus } from '#lib/icons/index.ts';
	import { useUrlTab } from '#lib/hooks/index.ts';
	import {
		leadDetailQuery,
		leadCallsQuery,
		leadRemindersQuery,
		leadHistoryQuery
	} from '#lib/features/leads/queries.ts';
	import {
		LeadDetailHeader,
		LeadProfileCard,
		LeadComplianceCard,
		CallLogTimeline,
		LogCallDialog,
		RemindersList,
		ReassignmentHistory,
		EditLeadDrawer,
		ReassignDialog
	} from '#lib/features/leads/index.ts';
	import { getListErrorMessage } from '#lib/api/error-messages.ts';

	const id = $derived(page.params.id ?? '');
	const detail = $derived(leadDetailQuery(id));
	const calls = $derived(leadCallsQuery(id));
	const reminders = $derived(leadRemindersQuery(id));
	const history = $derived(leadHistoryQuery(id));

	const callItems = $derived(calls.data?.items ?? []);
	const reminderItems = $derived(reminders.data?.items ?? []);
	const historyItems = $derived(history.data?.items ?? []);

	function listState(
		q: { isPending: boolean; isError: boolean },
		len: number
	): 'pending' | 'error' | 'empty' | 'ready' {
		if (q.isPending) return 'pending';
		if (q.isError) return 'error';
		if (len === 0) return 'empty';
		return 'ready';
	}

	let editOpen = $state(false);
	let reassignOpen = $state(false);
	let logCallOpen = $state(false);

	// URL-synced tab — `?tab=activity` deep-links into the call log, and
	// the browser back button restores the prior tab without a remount.
	const tab = useUrlTab('profile', ['profile', 'activity', 'reminders', 'history']);

	const detailErrorCopy = $derived.by(() => {
		const err = detail.error;
		if (!err) return '';
		return getListErrorMessage(err, 'this lead', 'This lead is no longer available.') ?? '';
	});
</script>

<svelte:head><title>Lead · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	{#if detail.isPending}
		<PageHeader title={$_('pages.lead.fallbackTitle')} />
		<div class="stack stack-tight">
			<Skeleton class="h-8 w-1/3 rounded" />
			<Skeleton class="h-4 w-1/4 rounded" />
		</div>
	{:else if detail.isError}
		<PageHeader title={$_('pages.lead.fallbackTitle')} />
		<div
			class="bg-destructive-soft text-destructive border-destructive-indicator rounded-md border-s-4 p-4"
		>
			<p class="label">Couldn't load lead. {detailErrorCopy}</p>
		</div>
	{:else if detail.data}
		{@const lead = detail.data}
		<LeadDetailHeader
			{lead}
			onEdit={() => (editOpen = true)}
			onReassign={() => (reassignOpen = true)}
		/>

		<Tabs.Root value={tab.value} onValueChange={tab.set}>
			<Tabs.List>
				<Tabs.Trigger value="profile">Profile</Tabs.Trigger>
				<Tabs.Trigger value="activity">Activity</Tabs.Trigger>
				<Tabs.Trigger value="reminders">Reminders</Tabs.Trigger>
				<Tabs.Trigger value="history">History</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="profile">
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<LeadProfileCard {lead} />
					<LeadComplianceCard {lead} />
				</div>
			</Tabs.Content>

			<Tabs.Content value="activity">
				<div class="stack stack-relaxed">
					<div class="cluster cluster-spread">
						<h2 class="h5">Call history</h2>
						{#if session.canAny(...ACTION.leadManage)}
							<Button size="sm" onclick={() => (logCallOpen = true)}>
								<Icon icon={Plus} size="xs" /> Log call
							</Button>
						{/if}
					</div>
					<CallLogTimeline items={callItems} state={listState(calls, callItems.length)} />
				</div>
			</Tabs.Content>

			<Tabs.Content value="reminders">
				<RemindersList
					leadId={lead.id}
					items={reminderItems}
					state={listState(reminders, reminderItems.length)}
				/>
			</Tabs.Content>

			<Tabs.Content value="history">
				<ReassignmentHistory items={historyItems} state={listState(history, historyItems.length)} />
			</Tabs.Content>
		</Tabs.Root>

		<EditLeadDrawer {lead} bind:open={editOpen} onOpenChange={(o) => (editOpen = o)} />
		<ReassignDialog
			leadId={lead.id}
			bind:open={reassignOpen}
			onOpenChange={(o) => (reassignOpen = o)}
		/>
		<LogCallDialog
			leadId={lead.id}
			bind:open={logCallOpen}
			onOpenChange={(o) => (logCallOpen = o)}
		/>
	{/if}
</div>
