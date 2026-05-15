<script lang="ts">
	import {
		Building2,
		Activity,
		Ban,
		Users,
		UserCheck,
		ClipboardCheck,
		ShoppingBag,
		UserCog
	} from 'lucide-svelte';
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

	type TileAccent = 'brand' | 'success' | 'warning' | 'danger';

	const tiles: Array<{
		label: string;
		hint: string;
		icon: typeof Building2;
		accent: TileAccent;
	}> = [
		{ label: 'Tenants total', hint: 'All-time signups', icon: Building2, accent: 'brand' },
		{ label: 'Tenants active', hint: 'status = active', icon: Activity, accent: 'success' },
		{ label: 'Tenants suspended', hint: 'Requires operator action', icon: Ban, accent: 'warning' },
		{ label: 'Persons total', hint: 'Across all tenants', icon: Users, accent: 'brand' },
		{ label: 'Active memberships', hint: 'Non-deactivated', icon: UserCheck, accent: 'success' },
		{
			label: 'Lead verification queue',
			hint: 'Unverified contacts pending review',
			icon: ClipboardCheck,
			accent: 'warning'
		},
		{
			label: 'Marketplace inventory',
			hint: 'Verified leads available for purchase',
			icon: ShoppingBag,
			accent: 'brand'
		},
		{
			label: 'Active impersonation sessions',
			hint: 'Operators currently impersonating',
			icon: UserCog,
			accent: 'danger'
		}
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
					class="caption inline-flex items-center rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 font-medium text-[var(--color-primary)]"
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

	<Alert variant="info" title="Skeleton — real data wires in Phase 2">
		The Platform module (lead marketplace + verification calls + credits) ships in leadkart-go Phase
		2 per CLAUDE.md "Up next". This dashboard's tiles get real counts as each endpoint lands. See
		docs/reference/dotnet-BRD.md §6.2 for the full Platform module spec.
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
