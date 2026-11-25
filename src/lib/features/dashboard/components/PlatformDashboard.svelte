<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import {
		Activity,
		Ban,
		Building2,
		ClipboardCheck,
		ShoppingBag,
		UserCheck,
		UserCog,
		Users
	} from '#lib/icons/index.ts';
	import { Alert, Badge, StatCard, type StatCardAccent } from '#lib/components/ui/index.ts';
	import { P, session } from '#lib/features/auth/index.ts';
	import { describeError } from '#lib/api/errors.ts';
	import { platformStatsQuery } from '#lib/features/operator/index.ts';

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

	// Label only: what the header badge says. Every widget below is gated by `can`.
	const isSuper = $derived(session.capabilities?.is_super_user === true);
	const canViewStats = $derived(session.can(P.platformTenantsView));

	const statsQuery = platformStatsQuery(() => canViewStats);
	const stats = $derived(statsQuery.data ?? null);
	const statsLoading = $derived(statsQuery.isPending);
	const statsError = $derived(
		statsQuery.isError
			? describeError(statsQuery.error, { fallback: 'Failed to load platform stats' })
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

	// Tiles backed by real stats: the number, or the em dash until the stats arrive.
	type StatTile = {
		label: string;
		hint: string;
		timeframe: string;
		icon: typeof Building2;
		accent: StatCardAccent;
		value: () => string | number;
	};

	const statTiles: StatTile[] = [
		{
			label: 'dashboard.tile.tenantsTotal.label',
			hint: 'dashboard.tile.tenantsTotal.hint',
			timeframe: 'dashboard.timeframe.allTime',
			icon: Building2,
			accent: 'primary',
			value: () => (stats ? stats.tenants_total : '—')
		},
		{
			label: 'dashboard.tile.tenantsActive.label',
			hint: 'dashboard.tile.tenantsActive.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: Activity,
			accent: 'success',
			value: () => (stats ? stats.tenants_active : '—')
		},
		{
			label: 'dashboard.tile.tenantsSuspended.label',
			hint: 'dashboard.tile.tenantsSuspended.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: Ban,
			accent: 'warning',
			value: () => (stats ? stats.tenants_suspended : '—')
		},
		{
			label: 'dashboard.tile.personsTotal.label',
			hint: 'dashboard.tile.personsTotal.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: Users,
			accent: 'primary',
			value: () => (stats ? stats.persons_total : '—')
		},
		{
			label: 'dashboard.tile.membershipsActive.label',
			hint: 'dashboard.tile.membershipsActive.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: UserCheck,
			accent: 'success',
			value: () => (stats ? stats.memberships_active : '—')
		}
	];

	// Phase 2 placeholder tiles (no endpoint yet).
	const placeholderTiles: Array<{
		label: string;
		hint: string;
		timeframe: string;
		icon: typeof Building2;
		accent: StatCardAccent;
	}> = [
		{
			label: 'dashboard.tile.verificationQueue.label',
			hint: 'dashboard.tile.verificationQueue.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: ClipboardCheck,
			accent: 'warning'
		},
		{
			label: 'dashboard.tile.marketplaceInventory.label',
			hint: 'dashboard.tile.marketplaceInventory.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: ShoppingBag,
			accent: 'primary'
		},
		{
			label: 'dashboard.tile.impersonationSessions.label',
			hint: 'dashboard.tile.impersonationSessions.hint',
			timeframe: 'dashboard.timeframe.now',
			icon: UserCog,
			accent: 'danger'
		}
	];
</script>

<div class="stack stack-relaxed">
	<PageHeader title={$_('dashboard.title.operator')}>
		{#snippet meta()}
			{#if isSuper}
				<Badge variant="danger">{$_('dashboard.badge.superAdmin')}</Badge>
			{:else}
				<Badge variant="brand">{$_('dashboard.badge.platformStaff')}</Badge>
			{/if}
		{/snippet}
	</PageHeader>
	<p class="body-sm text-muted-foreground">
		Cross-tenant operations: lead verification, tenant management, marketplace ops.
	</p>

	{#if canViewStats && statsError}
		<Alert variant="destructive" title="Stats unavailable">
			<p>{statsError}</p>
			<p class="caption text-muted-foreground mt-2">
				Check DevTools console for the raw error + Network tab for the
				<code>/v1/platform/stats</code> response.
			</p>
			<button
				type="button"
				class="label-small text-primary-text mt-3 underline hover:no-underline"
				onclick={() => statsQuery.refetch()}
			>
				Retry
			</button>
		</Alert>
	{/if}

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each canViewStats ? statTiles : [] as tile (tile.label)}
			<StatCard
				label={$_(tile.label)}
				hint={$_(tile.hint)}
				timeframe={$_(tile.timeframe)}
				value={tile.value()}
				icon={tile.icon}
				accent={tile.accent}
				loading={statsLoading}
			/>
		{/each}

		{#each placeholderTiles as tile (tile.label)}
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
</div>
