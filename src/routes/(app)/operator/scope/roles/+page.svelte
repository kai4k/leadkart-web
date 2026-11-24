<script lang="ts">
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { RolesList } from '#lib/features/roles/index.ts';
	import { UsersTruncatedAlert, usersListQuery } from '#lib/features/users/index.ts';
	import { ACTION, session } from '#lib/features/auth/index.ts';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	// Member counts need a users-view permission (see settings/roles): no permission, no call, no count.
	const mayListUsers = $derived(session.canAny(...ACTION.userView));
	const usersQuery = usersListQuery(() => mayListUsers);
	const roster = $derived(mayListUsers ? (usersQuery.data ?? []) : null);
</script>

<svelte:head><title>Roles · {plainTitle(data.tenant.display_name)} · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	{#if roster}<UsersTruncatedAlert count={roster.length} />{/if}
	<RolesList {roster} />
</div>
