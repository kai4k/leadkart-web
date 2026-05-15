<script lang="ts">
	import { UserPlus, PhoneCall, AlarmClock, ClipboardList } from 'lucide-svelte';
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
	 */

	const principal = $derived(session.principal);

	type TileAccent = 'brand' | 'success' | 'warning' | 'danger';

	const tiles: Array<{
		label: string;
		hint: string;
		icon: typeof UserPlus;
		accent: TileAccent;
	}> = [
		{
			label: 'My active leads',
			hint: 'Assigned to me, not Lost/Dead',
			icon: UserPlus,
			accent: 'brand'
		},
		{
			label: 'Callbacks today',
			hint: 'Scheduled within today’s window',
			icon: PhoneCall,
			accent: 'success'
		},
		{
			label: 'Overdue reminders',
			hint: 'Past their scheduled window',
			icon: AlarmClock,
			accent: 'warning'
		},
		{
			label: 'My open tasks',
			hint: 'WorkItems assigned to me',
			icon: ClipboardList,
			accent: 'brand'
		}
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

	<Alert variant="info" title="Skeleton — your CRM workspace lands in Phase 4">
		Once the CRM module ships, this view becomes your daily driver: today's callbacks at the top,
		overdue reminders highlighted, your active leads ranked by temperature + last-touched.
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
		color: var(--color-primary);
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
