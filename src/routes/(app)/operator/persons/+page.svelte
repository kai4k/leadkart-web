<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PeopleList from '$features/operator/people/components/PeopleList.svelte';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'platform.users.view')) {
			goto(resolve('/dashboard'), { replaceState: true });
		}
	});
</script>

<svelte:head><title>Platform users · LeadKart</title></svelte:head>

<PeopleList />
