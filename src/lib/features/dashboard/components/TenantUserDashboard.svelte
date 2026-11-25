<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import { AlarmClock, ClipboardList, PhoneCall, UserPlus } from '#lib/icons/index.ts';
	import { Alert, StatCard, type StatCardAccent } from '#lib/components/ui/index.ts';
	import { session } from '#lib/features/auth/index.ts';

	/**
	 * Regular-tenant-user dashboard skeleton.
	 *
	 * Audience: SalesExecutive / PurchaseExecutive / DispatchExecutive /
	 * HrExecutive / general user (per docs/reference/dotnet-BRD.md §3.2).
	 * Personal workspace — only THEIR assigned work, no team overview.
	 *
	 * Real data sources (when wired):
	 *   (Phase 4) GET /api/v1/crm/leads/me           — my assigned leads
	 *   (Phase 4) GET /api/v1/crm/reminders/today    — today's callbacks
	 *   (Phase 4) GET /api/v1/crm/reminders/overdue  — overdue reminders
	 *   GET /api/v1/tasks/me                         — my open tasks
	 */

	const email = $derived(session.principal?.email ?? '—');

	const tiles: Array<{
		label: string;
		hint: string;
		timeframe: string;
		icon: typeof UserPlus;
		accent: StatCardAccent;
	}> = [
		{
			label: 'dashboard.tile.myActiveLeads.label',
			hint: 'dashboard.tile.myActiveLeads.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: UserPlus,
			accent: 'primary'
		},
		{
			label: 'dashboard.tile.callbacksToday.label',
			hint: 'dashboard.tile.callbacksToday.hint',
			timeframe: 'dashboard.timeframe.today',
			icon: PhoneCall,
			accent: 'success'
		},
		{
			label: 'dashboard.tile.overdueReminders.label',
			hint: 'dashboard.tile.overdueReminders.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: AlarmClock,
			accent: 'warning'
		},
		{
			label: 'dashboard.tile.myOpenTasks.label',
			hint: 'dashboard.tile.myOpenTasks.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: ClipboardList,
			accent: 'primary'
		}
	];
</script>

<div class="stack stack-relaxed">
	<PageHeader title={$_('dashboard.title.tenantUser')} />
	<p class="body-sm text-muted-foreground">
		Signed in as <code class="code-inline">{email}</code>.
	</p>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each tiles as tile (tile.label)}
			<StatCard
				label={$_(tile.label)}
				hint={$_(tile.hint)}
				timeframe={$_(tile.timeframe)}
				value="—"
				icon={tile.icon}
				accent={tile.accent}
			/>
		{/each}
	</div>

	<Alert variant="info" title="Skeleton — your CRM workspace lands in Phase 4">
		Once the CRM module ships, this view becomes your daily driver: today's callbacks at the top,
		overdue reminders highlighted, your active leads ranked by temperature + last-touched.
	</Alert>
</div>
