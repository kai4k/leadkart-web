<script lang="ts">
	import { dashboardVariant, session } from '$features/auth';
	import {
		PlatformDashboard,
		TenantAdminDashboard,
		TenantUserDashboard
	} from '$features/dashboard';

	/**
	 * /dashboard — routes to the appropriate dashboard variant based on
	 * capabilities from the server (ADR 0038 N1). The variant is a layout
	 * choice (is_platform / Go's tier band), never an authorisation: what each
	 * dashboard shows is gated by `session.can`.
	 *
	 *   platform → PlatformDashboard
	 *   owner / admin tier → TenantAdminDashboard
	 *   everyone else → TenantUserDashboard
	 */

	const variant = $derived(dashboardVariant(session.capabilities));
</script>

<svelte:head>
	<title>Dashboard · LeadKart</title>
</svelte:head>

{#if variant === 'platform'}
	<PlatformDashboard />
{:else if variant === 'tenant-admin'}
	<TenantAdminDashboard />
{:else}
	<TenantUserDashboard />
{/if}
