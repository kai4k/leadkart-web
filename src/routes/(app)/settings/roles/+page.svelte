<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { RolesList } from '$features/roles';
	import { usersListQuery } from '$features/users';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'identity.roles.view')) {
			goto(resolve('dashboard'), { replace: true });
		}
	});

	const usersQuery = usersListQuery();
	const roster = $derived(usersQuery.data?.users ?? []);
</script>

<svelte:head><title>Roles · LeadKart</title></svelte:head>

<RolesList {roster} />
