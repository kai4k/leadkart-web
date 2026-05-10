<script lang="ts">
	import { Alert, Card } from '$ui';
	import { session } from '$features/auth/stores/session.svelte';

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
	 *
	 * Different from the tenant-admin dashboard in scope (personal vs
	 * team) — same component shell, different queries.
	 */

	const principal = $derived(session.principal);

	const tiles = [
		{ label: 'My active leads', hint: 'Assigned to me, not Lost/Dead' },
		{ label: 'Callbacks today', hint: 'Scheduled within today’s window' },
		{ label: 'Overdue reminders', hint: 'Past their scheduled window' },
		{ label: 'My open tasks', hint: 'WorkItems assigned to me' }
	];
</script>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h1 class="h1">My Dashboard</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">
			Signed in as <code class="code-inline">{principal?.email ?? '—'}</code>.
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

	<Alert variant="info" title="Skeleton — your CRM workspace lands in Phase 4">
		Once the CRM module ships, this view becomes your daily driver: today's callbacks at the top,
		overdue reminders highlighted, your active leads ranked by temperature + last-touched.
	</Alert>
</div>
