<script lang="ts">
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

	const tiles = [
		{ label: 'Lead credits', hint: 'Available for marketplace purchases' },
		{ label: 'Team active', hint: 'Memberships with status=active' },
		{ label: 'Leads this week', hint: 'Worked across the team' },
		{ label: 'Conversion this month', hint: 'New → Converted' },
		{ label: 'Open orders', hint: 'Quotation + Confirmed' },
		{ label: 'Pending dispatches', hint: 'Packed but not consigned' },
		{ label: 'Inventory alerts', hint: 'Low stock + expiring batches' },
		{ label: 'Overdue tasks', hint: 'Across the team' }
	];
</script>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<div class="cluster">
			<h1 class="h1">Tenant Dashboard</h1>
			<span
				class="caption inline-flex items-center rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 font-medium text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-100)]"
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
			<Card.Root>
				<Card.Header>
					<Card.Description>{tile.label}</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="display-2 tabular-nums">—</p>
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
