<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { TenantsList } from '$features/operator/tenants';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'platform.tenants.view')) {
			goto(resolve('dashboard'), { replace: true });
		}
	});
</script>

<svelte:head><title>Tenants · LeadKart</title></svelte:head>

<TenantsList />
