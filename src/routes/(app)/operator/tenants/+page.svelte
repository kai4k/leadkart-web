<script lang="ts">
	import { goto } from '$app/navigation';
	import TenantsList from '$features/operator/tenants/components/TenantsList.svelte';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'platform.tenants.view')) {
			goto('/dashboard', { replaceState: true });
		}
	});
</script>

<svelte:head><title>Tenants · LeadKart</title></svelte:head>

<TenantsList />
