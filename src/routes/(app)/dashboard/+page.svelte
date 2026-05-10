<script lang="ts">
	import { session } from '$features/auth/stores/session.svelte';
	import { tierOf } from '$features/auth/tier';
	import PlatformDashboard from '$features/dashboard/components/PlatformDashboard.svelte';
	import TenantAdminDashboard from '$features/dashboard/components/TenantAdminDashboard.svelte';
	import TenantUserDashboard from '$features/dashboard/components/TenantUserDashboard.svelte';

	/**
	 * /dashboard — router that branches into the appropriate dashboard
	 * variant for the signed-in principal's tier.
	 *
	 *   platform-super, platform-staff → PlatformDashboard
	 *   tenant-admin                   → TenantAdminDashboard
	 *   tenant-user (and unknown,
	 *     which shouldn't reach here   → TenantUserDashboard
	 *     because (app)/+layout.ts
	 *     gates on isAuthenticated)
	 *
	 * Each variant is a self-contained component under
	 * `lib/features/dashboard/components/`. As Phase 2-5 modules ship,
	 * tiles inside each variant wire to real endpoints; the router
	 * itself does not change.
	 */

	const tier = $derived(tierOf(session.principal));
</script>

<svelte:head>
	<title>Dashboard · LeadKart</title>
</svelte:head>

{#if tier === 'platform-super' || tier === 'platform-staff'}
	<PlatformDashboard />
{:else if tier === 'tenant-admin'}
	<TenantAdminDashboard />
{:else}
	<TenantUserDashboard />
{/if}
