<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import {
		AlertTriangle,
		ClipboardList,
		Coins,
		PackageCheck,
		TrendingUp,
		Truck,
		UserPlus,
		Users
	} from '#lib/icons/index.ts';
	import { Alert, Badge, StatCard, type StatCardAccent } from '#lib/components/ui/index.ts';
	import { session } from '#lib/features/auth/index.ts';

	/**
	 * Tenant-admin dashboard skeleton.
	 *
	 * Audience: CompanyOwner / OfficeAdministrator (per docs/reference/
	 * dotnet-BRD.md §3.2). Full tenant scope — sees team activity, lead
	 * credits, order pipeline, inventory health, dispatch backlog.
	 *
	 * Real data sources (when wired):
	 *   GET /api/v1/tenants/{tenantId}              — credit balance,
	 *                                                  subscription state
	 *   GET /api/v1/users (filter status=active)    — team size
	 *   (Phase 2) GET /api/v1/lead-credits           — recent purchases
	 *   (Phase 4) GET /api/v1/crm/leads/pipeline     — by-stage counts
	 *   (Phase 5) GET /api/v1/orders                  — order pipeline
	 *   (Phase 5) GET /api/v1/inventory/alerts        — low stock + expiring
	 *   (Phase 5) GET /api/v1/dispatch/queue          — pending dispatches
	 *   GET /api/v1/tasks/me + GET /tasks/overdue    — task summary
	 */

	const email = $derived(session.principal?.email ?? '—');

	const tiles: Array<{
		label: string;
		hint: string;
		timeframe: string;
		icon: typeof Coins;
		accent: StatCardAccent;
	}> = [
		{
			label: 'dashboard.tile.leadCredits.label',
			hint: 'dashboard.tile.leadCredits.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: Coins,
			accent: 'primary'
		},
		{
			label: 'dashboard.tile.teamActive.label',
			hint: 'dashboard.tile.teamActive.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: Users,
			accent: 'neutral'
		},
		{
			label: 'dashboard.tile.leadsThisWeek.label',
			hint: 'dashboard.tile.leadsThisWeek.hint',
			timeframe: 'dashboard.timeframe.thisWeek',
			icon: UserPlus,
			accent: 'primary'
		},
		{
			label: 'dashboard.tile.conversionThisMonth.label',
			hint: 'dashboard.tile.conversionThisMonth.hint',
			timeframe: 'dashboard.timeframe.thisMonth',
			icon: TrendingUp,
			accent: 'primary'
		},
		{
			label: 'dashboard.tile.openOrders.label',
			hint: 'dashboard.tile.openOrders.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: PackageCheck,
			accent: 'primary'
		},
		{
			label: 'dashboard.tile.pendingDispatches.label',
			hint: 'dashboard.tile.pendingDispatches.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: Truck,
			accent: 'neutral'
		},
		{
			label: 'dashboard.tile.inventoryAlerts.label',
			hint: 'dashboard.tile.inventoryAlerts.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: AlertTriangle,
			accent: 'warning'
		},
		{
			label: 'dashboard.tile.overdueTasks.label',
			hint: 'dashboard.tile.overdueTasks.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: ClipboardList,
			accent: 'danger'
		}
	];
</script>

<div class="stack stack-relaxed">
	<PageHeader title={$_('dashboard.title.tenantAdmin')}>
		{#snippet meta()}
			<Badge variant="brand">{$_('dashboard.badge.admin')}</Badge>
		{/snippet}
	</PageHeader>
	<p class="body-sm text-muted-foreground">
		Signed in as <code class="code-inline">{email}</code>. Full team overview across CRM, orders,
		inventory, and dispatch.
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

	<Alert variant="info" title="Skeleton — feature modules land in v0.4 / v0.5">
		Tile data wires module-by-module: CRM (Phase 4) populates leads + conversion; Orders + Inventory
		+ Dispatch (Phase 5) populate the operational tiles. Phase 2 Platform module brings the lead-
		credits balance.
	</Alert>
</div>
