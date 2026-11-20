<script lang="ts">
	import { RolesList } from '$features/roles';
	import { UsersTruncatedAlert, usersListQuery } from '$features/users';
	import { ACTION, session } from '$features/auth';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	// Member counts need a users-view permission (see settings/roles): no permission, no call, no count.
	const mayListUsers = $derived(session.canAny(...ACTION.userView));
	const usersQuery = usersListQuery(() => mayListUsers);
	const roster = $derived(mayListUsers ? (usersQuery.data ?? []) : null);
</script>

<svelte:head><title>Roles · {data.tenant.display_name} · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	{#if roster}<UsersTruncatedAlert count={roster.length} />{/if}
	<RolesList {roster} />
</div>
