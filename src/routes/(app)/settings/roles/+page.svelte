<script lang="ts">
	import RolesList from '$features/roles/components/RolesList.svelte';
	import { roles } from '$features/roles/stores/roles.svelte';
	import { users } from '$features/users/stores/users.svelte';

	$effect(() => {
		if (roles.status === 'idle') roles.load().catch(() => {});
		if (users.status === 'idle') users.load().catch(() => {});
	});
</script>

<svelte:head><title>Roles · LeadKart</title></svelte:head>

<RolesList />
