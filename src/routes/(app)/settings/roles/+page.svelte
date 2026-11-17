<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { RolesList } from '$features/roles';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'identity.roles.view')) {
			goto(resolve('dashboard'), { replace: true });
		}
	});
</script>

<svelte:head><title>Roles · LeadKart</title></svelte:head>

<RolesList />
