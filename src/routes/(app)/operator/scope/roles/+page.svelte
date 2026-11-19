<script lang="ts">
	import { RolesList } from '$features/roles';
	import { UsersTruncatedAlert, usersListQuery } from '$features/users';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const usersQuery = usersListQuery();
	const roster = $derived(usersQuery.data ?? []);
</script>

<svelte:head><title>Roles · {data.tenant.display_name} · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<UsersTruncatedAlert count={roster.length} />
	<RolesList {roster} />
</div>
