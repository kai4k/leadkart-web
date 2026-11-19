<script lang="ts">
	import { RolesList } from '$features/roles';
	import { UsersTruncatedAlert, usersListQuery } from '$features/users';

	const usersQuery = usersListQuery();
	const roster = $derived(usersQuery.data ?? []);
</script>

<svelte:head><title>Roles · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<UsersTruncatedAlert count={roster.length} />
	<RolesList {roster} />
</div>
