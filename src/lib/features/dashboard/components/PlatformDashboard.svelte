<script lang="ts">
	import { Alert, Card } from '$ui';
	import { session } from '$features/auth/stores/session.svelte';
	import { tierOf } from '$features/auth/tier';

	/**
	 * Platform-tier dashboard skeleton.
	 *
	 * Audience: SuperAdmin + PlatformManager + LeadAgent (LeadKart
	 * internal staff). Per docs/reference/dotnet-BRD.md §3.1, they
	 * source/verify/sell pharma leads + manage tenants.
	 *
	 * Real data sources (when wired):
	 *   GET /api/v1/platform/stats           — top-line counts
	 *   GET /api/v1/platform/tenants         — recent signups + signup feed
	 *   (Phase 2) GET /api/v1/platform/leads/unverified  — verification queue size
	 *   (Phase 2) GET /api/v1/platform/leads/marketplace — inventory depth
	 *
	 * Today's placeholder tiles show em-dash. As Phase 2 ships endpoints,
	 * each tile gets its own gateway call + view model.
	 */

	const principal = $derived(session.principal);
	const isSuper = $derived(tierOf(principal) === 'platform-super');

	const tiles = [
		{ label: 'Tenants total', hint: 'All-time signups' },
		{ label: 'Tenants active', hint: 'status = active' },
		{ label: 'Tenants suspended', hint: 'Requires operator action' },
		{ label: 'Persons total', hint: 'Across all tenants' },
		{ label: 'Active memberships', hint: 'Non-deactivated' },
		{ label: 'Lead verification queue', hint: 'Unverified contacts pending review' },
		{ label: 'Marketplace inventory', hint: 'Verified leads available for purchase' },
		{ label: 'Active impersonation sessions', hint: 'Operators currently impersonating' }
	];
</script>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<div class="cluster">
			<h1 class="h1">Operator Dashboard</h1>
			{#if isSuper}
				<span
					class="caption inline-flex items-center rounded-full bg-[var(--color-danger-50)] px-2 py-0.5 font-medium text-[var(--color-danger-900)]"
				>
					SuperAdmin
				</span>
			{:else}
				<span
					class="caption inline-flex items-center rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 font-medium text-[var(--color-brand-700)]"
				>
					Platform Staff
				</span>
			{/if}
		</div>
		<p class="body-sm text-[var(--color-fg-muted)]">
			Cross-tenant operations: lead verification, tenant management, marketplace ops.
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

	<Alert variant="info" title="Skeleton — real data wires in Phase 2">
		The Platform module (lead marketplace + verification calls + credits) ships in leadkart-go Phase
		2 per CLAUDE.md "Up next". This dashboard's tiles get real counts as each endpoint lands. See
		docs/reference/dotnet-BRD.md §6.2 for the full Platform module spec.
	</Alert>
</div>
