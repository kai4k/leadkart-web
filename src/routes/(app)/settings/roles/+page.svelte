<script lang="ts">
	import { RolesList } from '#lib/features/roles/index.ts';
	import { UsersTruncatedAlert, usersListQuery } from '#lib/features/users/index.ts';
	import { ACTION, session } from '#lib/features/auth/index.ts';

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
