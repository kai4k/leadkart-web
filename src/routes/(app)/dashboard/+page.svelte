<script lang="ts">
	import { myCapabilitiesQuery } from '$features/auth/queries';
	import PlatformDashboard from '$features/dashboard/components/PlatformDashboard.svelte';
	import TenantAdminDashboard from '$features/dashboard/components/TenantAdminDashboard.svelte';
	import TenantUserDashboard from '$features/dashboard/components/TenantUserDashboard.svelte';

	/**
	 * /dashboard — routes to the appropriate dashboard variant based on
	 * capabilities from the server (ADR 0038 N1).
	 *
	 *   platform-super, platform-staff → PlatformDashboard
	 *   tenant-admin                   → TenantAdminDashboard
	 *   tenant-user / unknown          → TenantUserDashboard
	 */

	const capsQuery = myCapabilitiesQuery();
	const tier = $derived(capsQuery.data?.tier ?? 'unknown');
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
