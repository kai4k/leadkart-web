<script lang="ts">
	/**
	 * Lead detail page — header strip + tabs (Profile / Activity /
	 * Reminders / History).
	 *
	 * Composition only: every section is its own component, every fetch
	 * goes through TanStack hooks, every mutation lives in `queries.ts`.
	 */
	import { page } from '$app/state';
	import { Tabs, Skeleton } from '$ui';
	import { Button } from '$ui';
	import { Icon, Plus } from '$icons';
	import {
		leadDetailQuery,
		leadCallsQuery,
		leadRemindersQuery,
		leadHistoryQuery
	} from '$features/leads/queries';
	import LeadDetailHeader from '$features/leads/components/LeadDetailHeader.svelte';
	import LeadProfileCard from '$features/leads/components/LeadProfileCard.svelte';
	import LeadComplianceCard from '$features/leads/components/LeadComplianceCard.svelte';
	import CallLogTimeline from '$features/leads/components/CallLogTimeline.svelte';
	import LogCallDialog from '$features/leads/components/LogCallDialog.svelte';
	import RemindersList from '$features/leads/components/RemindersList.svelte';
	import ReassignmentHistory from '$features/leads/components/ReassignmentHistory.svelte';
	import EditLeadDrawer from '$features/leads/components/EditLeadDrawer.svelte';
	import ReassignDialog from '$features/leads/components/ReassignDialog.svelte';

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
	let activeTab = $state('profile');
</script>

<svelte:head><title>Lead · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	{#if detail.isPending}
		<div class="stack stack-tight">
			<Skeleton class="h-8 w-1/3 rounded" />
			<Skeleton class="h-4 w-1/4 rounded" />
		</div>
	{:else if detail.isError}
		<div class="bg-danger-50 text-danger-900 border-danger-500 rounded-md border-l-4 p-4">
			<p class="label">Couldn't load lead. {detail.error?.message ?? ''}</p>
		</div>
	{:else if detail.data}
		{@const lead = detail.data}
		<LeadDetailHeader
			{lead}
			onEdit={() => (editOpen = true)}
			onReassign={() => (reassignOpen = true)}
		/>

		<Tabs.Root bind:value={activeTab}>
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
						<h3 class="h5">Call history</h3>
						<Button size="sm" onclick={() => (logCallOpen = true)}>
							<Icon icon={Plus} size="xs" /> Log call
						</Button>
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
