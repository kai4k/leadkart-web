<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import RolesList from '$features/roles/components/RolesList.svelte';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'identity.roles.view')) {
			goto(resolve('/dashboard'), { replaceState: true });
		}
	});
</script>

<svelte:head><title>Roles · LeadKart</title></svelte:head>

<RolesList />
