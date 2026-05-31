<script lang="ts">
	import {
		Activity,
		Ban,
		Building2,
		ClipboardCheck,
		Icon,
		ShoppingBag,
		UserCheck,
		UserCog,
		Users
	} from '$lib/icons';
	import { Alert, Card, Spinner } from '$ui';
	import { myCapabilitiesQuery } from '$features/auth/queries';
	import { deriveTier } from '$features/auth/capabilities';
	import { ApiError } from '$api/errors';
	import { platformStatsQuery } from '$lib/features/operator/dashboard/queries';

	/**
	 * Platform-tier dashboard.
	 *
	 * Audience: SuperAdmin + PlatformManager + LeadAgent (LeadKart
	 * internal staff). Per docs/reference/dotnet-BRD.md §3.1.
	 *
	 * Real data sources wired via TanStack Query (60 s auto-refresh):
	 *   GET /api/v1/platform/stats  — tenants_total/active/suspended,
	 *                                  persons_total, memberships_active
	 *
	 * Future Phase 2 tiles (verification queue, marketplace inventory,
	 * active impersonation sessions) remain as placeholders until the
	 * backend endpoints land.
	 */

	const capsQuery = myCapabilitiesQuery();
	const isSuper = $derived(deriveTier(capsQuery.data) === 'platform-super');

	type TileAccent = 'brand' | 'success' | 'warning' | 'danger';

	const statsQuery = platformStatsQuery();
	const stats = $derived(statsQuery.data ?? null);
	const statsLoading = $derived(statsQuery.isPending);
	const statsError = $derived(
		statsQuery.isError
			? statsQuery.error instanceof ApiError
				? statsQuery.error.message
				: 'Failed to load platform stats'
			: null
	);

	// Surface the raw error in DevTools so engineers can inspect the
	// failure (network 4xx/5xx body, zod parse path, etc.). Re-runs
	// whenever the error reference changes — won't spam the console.
	$effect(() => {
		if (statsQuery.isError) {
			console.error('[PlatformDashboard] platformStatsQuery failed:', statsQuery.error);
		}
	});

	// Tiles backed by real stats — show actual number or '—' while loading.
	type StatTile = {
		label: string;
		hint: string;
		icon: typeof Building2;
		accent: TileAccent;
		value: () => string | number;
	};

	const statTiles: StatTile[] = [
		{
			label: 'Tenants total',
			hint: 'All-time signups',
			icon: Building2,
			accent: 'brand',
			value: () => (stats ? stats.tenants_total : '—')
		},
		{
			label: 'Tenants active',
			hint: 'status = active',
			icon: Activity,
			accent: 'success',
			value: () => (stats ? stats.tenants_active : '—')
		},
		{
			label: 'Tenants suspended',
			hint: 'Requires operator action',
			icon: Ban,
			accent: 'warning',
			value: () => (stats ? stats.tenants_suspended : '—')
		},
		{
			label: 'Persons total',
			hint: 'Across all tenants',
			icon: Users,
			accent: 'brand',
			value: () => (stats ? stats.persons_total : '—')
		},
		{
			label: 'Active memberships',
			hint: 'Non-deactivated',
			icon: UserCheck,
			accent: 'success',
			value: () => (stats ? stats.memberships_active : '—')
		}
	];

	// Phase 2 placeholder tiles (no endpoint yet).
	const placeholderTiles: Array<{
		label: string;
		hint: string;
		icon: typeof Building2;
		accent: TileAccent;
	}> = [
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
					class="label-small bg-danger-50 text-danger-900 inline-flex items-center rounded-full px-2 py-0.5"
				>
					SuperAdmin
				</span>
			{:else}
				<span
					class="label-small bg-primary-soft text-primary inline-flex items-center rounded-full px-2 py-0.5"
				>
					Platform Staff
				</span>
			{/if}
		</div>
		<p class="body-sm text-fg-muted">
			Cross-tenant operations: lead verification, tenant management, marketplace ops.
		</p>
	</header>

	{#if statsError}
		<Alert variant="danger" title="Stats unavailable">
			<p>{statsError}</p>
			<p class="caption text-fg-muted mt-2">
				Check DevTools console for the raw error + Network tab for the
				<code>/v1/platform/stats</code> response.
			</p>
			<button
				type="button"
				class="label-small text-primary hover:text-primary-hover mt-3 underline"
				onclick={() => statsQuery.refetch()}
			>
				Retry
			</button>
		</Alert>
	{/if}

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each statTiles as tile (tile.label)}
			<Card.Root surface="glass" class="hover:bg-bg-muted">
				<Card.Header>
					<div class="cluster" style="--cluster-gap: var(--spacing-3);">
						<span class={`lk-dash-tile-icon lk-dash-tile-icon--${tile.accent}`} aria-hidden="true">
							<Icon icon={tile.icon} size="sm" />
						</span>
						<Card.Description>{tile.label}</Card.Description>
					</div>
				</Card.Header>
				<Card.Content>
					{#if statsLoading}
						<Spinner size={16} />
					{:else}
						<p class="display-2 text-fg tabular-nums">{tile.value()}</p>
					{/if}
					<p class="caption text-fg-subtle mt-1">{tile.hint}</p>
				</Card.Content>
			</Card.Root>
		{/each}

		{#each placeholderTiles as tile (tile.label)}
			<Card.Root surface="glass" class="hover:bg-bg-muted">
				<Card.Header>
					<div class="cluster" style="--cluster-gap: var(--spacing-3);">
						<span class={`lk-dash-tile-icon lk-dash-tile-icon--${tile.accent}`} aria-hidden="true">
							<Icon icon={tile.icon} size="sm" />
						</span>
						<Card.Description>{tile.label}</Card.Description>
					</div>
				</Card.Header>
				<Card.Content>
					<p class="display-2 text-fg-subtle tabular-nums">—</p>
					<p class="caption text-fg-subtle mt-1">{tile.hint}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
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
		background: var(--color-primary-soft);
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
