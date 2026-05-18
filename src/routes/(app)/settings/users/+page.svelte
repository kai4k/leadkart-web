<script lang="ts">
	import UsersList from '$features/users/components/UsersList.svelte';
	import { users } from '$features/users/stores/users.svelte';

	$effect(() => {
		if (users.status === 'idle') {
			users.load().catch(() => {});
		}
	});
</script>

<svelte:head>
	<title>Team · LeadKart</title>
</svelte:head>

<UsersList />
