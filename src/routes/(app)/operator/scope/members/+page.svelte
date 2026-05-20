<script lang="ts">
	import UsersList from '$features/users/components/UsersList.svelte';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();
</script>

<svelte:head><title>Members · {data.tenant.display_name} · LeadKart</title></svelte:head>

<UsersList />
