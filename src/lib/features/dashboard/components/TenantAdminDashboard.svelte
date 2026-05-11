<script lang="ts">
	import {
		Coins,
		Users,
		UserPlus,
		TrendingUp,
		PackageCheck,
		Truck,
		AlertTriangle,
		ClipboardList
	} from 'lucide-svelte';
	import { Alert, Card } from '$ui';
	import { session } from '$features/auth/stores/session.svelte';

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

	const principal = $derived(session.principal);

	type TileAccent = 'brand' | 'success' | 'warning' | 'danger';

	const tiles: Array<{
		label: string;
		hint: string;
		icon: typeof Coins;
		accent: TileAccent;
	}> = [
		{
			label: 'Lead credits',
			hint: 'Available for marketplace purchases',
			icon: Coins,
			accent: 'brand'
		},
		{
			label: 'Team active',
			hint: 'Memberships with status=active',
			icon: Users,
			accent: 'success'
		},
		{ label: 'Leads this week', hint: 'Worked across the team', icon: UserPlus, accent: 'brand' },
		{
			label: 'Conversion this month',
			hint: 'New → Converted',
			icon: TrendingUp,
			accent: 'success'
		},
		{ label: 'Open orders', hint: 'Quotation + Confirmed', icon: PackageCheck, accent: 'brand' },
		{
			label: 'Pending dispatches',
			hint: 'Packed but not consigned',
			icon: Truck,
			accent: 'warning'
		},
		{
			label: 'Inventory alerts',
			hint: 'Low stock + expiring batches',
			icon: AlertTriangle,
			accent: 'warning'
		},
		{
			label: 'Overdue tasks',
			hint: 'Across the team',
			icon: ClipboardList,
			accent: 'danger'
		}
	];
</script>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<div class="cluster">
			<h1 class="h1">Tenant Dashboard</h1>
			<span
				class="caption inline-flex items-center rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 font-medium text-[var(--color-brand-700)]"
			>
				Admin
			</span>
		</div>
		<p class="body-sm text-[var(--color-fg-muted)]">
			Signed in as <code class="code-inline">{principal?.email ?? '—'}</code>. Full team overview
			across CRM, orders, inventory, and dispatch.
		</p>
	</header>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each tiles as tile (tile.label)}
			{@const Icon = tile.icon}
			<Card.Root class="lk-dash-tile transition-shadow hover:shadow-md">
				<Card.Header>
					<div class="cluster" style="--cluster-gap: var(--spacing-3);">
						<span class={`lk-dash-tile-icon lk-dash-tile-icon--${tile.accent}`} aria-hidden="true">
							<Icon size={16} />
						</span>
						<Card.Description>{tile.label}</Card.Description>
					</div>
				</Card.Header>
				<Card.Content>
					<p class="display-2 text-[var(--color-fg-subtle)] tabular-nums">—</p>
					<p class="caption mt-1 text-[var(--color-fg-subtle)]">{tile.hint}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<Alert variant="info" title="Skeleton — feature modules land in v0.4 / v0.5">
		Tile data wires module-by-module: CRM (Phase 4) populates leads + conversion; Orders + Inventory
		+ Dispatch (Phase 5) populate the operational tiles. Phase 2 Platform module brings the lead-
		credits balance.
	</Alert>
</div>

<style>
	.lk-dash-tile-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 2rem;
		block-size: 2rem;
		border-radius: 0.5rem;
		flex-shrink: 0;
	}
	.lk-dash-tile-icon--brand {
		background: var(--color-brand-50);
		color: var(--color-brand-700);
	}
	.lk-dash-tile-icon--success {
		background: var(--color-success-50);
		color: var(--color-success-700);
	}
	.lk-dash-tile-icon--warning {
		background: var(--color-warning-50);
		color: var(--color-warning-700);
	}
	.lk-dash-tile-icon--danger {
		background: var(--color-danger-50);
		color: var(--color-danger-700);
	}
</style>
