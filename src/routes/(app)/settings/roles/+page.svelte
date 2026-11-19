<script lang="ts">
	import { RolesList } from '$features/roles';
	import { usersListQuery } from '$features/users';

	const usersQuery = usersListQuery();
	const roster = $derived(usersQuery.data ?? []);
</script>

<svelte:head><title>Roles · LeadKart</title></svelte:head>

<RolesList {roster} />
