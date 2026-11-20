<script lang="ts">
	import { RolesList } from '$features/roles';
	import { UsersTruncatedAlert, usersListQuery } from '$features/users';
	import { ACTION, session } from '$features/auth';

	// The member counts come from GET /users, which needs a users-view permission: without it the
	// call would 403 silently and every role would claim 0 members, so it is not made, and the
	// count is not shown.
	const mayListUsers = $derived(session.canAny(...ACTION.userView));
	const usersQuery = usersListQuery(() => mayListUsers);
	const roster = $derived(mayListUsers ? (usersQuery.data ?? []) : null);
</script>

<svelte:head><title>Roles · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	{#if roster}<UsersTruncatedAlert count={roster.length} />{/if}
	<RolesList {roster} />
</div>
