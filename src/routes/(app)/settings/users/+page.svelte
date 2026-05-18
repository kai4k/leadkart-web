<script lang="ts">
	import { goto } from '$app/navigation';
	import UsersList from '$features/users/components/UsersList.svelte';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'identity.users.view')) {
			goto('/dashboard', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>Team · LeadKart</title>
</svelte:head>

<UsersList />
