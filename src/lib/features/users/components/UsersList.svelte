<script lang="ts">
	import { page as pageStore } from '$app/stores';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Alert, Button, EmptyState, Pagination, Spinner } from '$ui';
	import { Plus, UserPlus, Users as UsersIcon, Icon } from '$icons';
	import {
		usersListQuery,
		rolesCatalogQuery,
		reactivateUserMutation,
		unlockUserMutation
	} from '$features/users/queries';
	import type { UserDto } from '$features/users/types';
	import UserListRow from './UserListRow.svelte';
	import CreateUserDrawer from './CreateUserDrawer.svelte';
	import DeactivateUserDialog from './DeactivateUserDialog.svelte';
	import RoleAssignmentDrawer from './RoleAssignmentDrawer.svelte';
	import ManagerSelectorDrawer from './ManagerSelectorDrawer.svelte';
	import PermissionOverridesPanel from './PermissionOverridesPanel.svelte';

	/**
	 * When tenantId is set, all queries and mutations inject X-Tenant-Id
	 * (operator-context member view). When absent, uses the caller's JWT
	 * tenant (tenant-admin self-view at /settings/users).
	 */
	type Props = { tenantId?: string };
	let { tenantId }: Props = $props();

	let createOpen = $state(false);
	let deactivateOpen = $state(false);
	let rolesOpen = $state(false);
	let managerOpen = $state(false);
	let permsOpen = $state(false);
	let targetUser = $state<UserDto | null>(null);

	// URL-driven filter state.
	const search = $derived($pageStore.url.searchParams.get('q') ?? '');
	const page = $derived(Number($pageStore.url.searchParams.get('page') ?? '1') || 1);
	const pageSize = 10;

	function setSearch(value: string) {
		const params = new SvelteURLSearchParams($pageStore.url.searchParams.toString());
		if (value) {
			params.set('q', value);
		} else {
			params.delete('q');
		}
		params.delete('page');
		goto(`?${params}`, { replaceState: true, keepFocus: true });
	}

	function setPage(p: number) {
		const params = new SvelteURLSearchParams($pageStore.url.searchParams.toString());
		if (p > 1) {
			params.set('page', String(p));
		} else {
			params.delete('page');
		}
		goto(`?${params}`, { replaceState: true });
	}

	const listQuery = $derived(usersListQuery(tenantId));
	const rolesQuery = $derived(rolesCatalogQuery(tenantId));
	const reactivate = $derived(reactivateUserMutation(tenantId));
	const unlock = $derived(unlockUserMutation(tenantId));

	const userList = $derived(listQuery.data?.users ?? []);
	const roleList = $derived(rolesQuery.data?.roles ?? []);

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return userList;
		return userList.filter(
			(u) =>
				u.email.toLowerCase().includes(q) ||
				u.first_name.toLowerCase().includes(q) ||
				u.last_name.toLowerCase().includes(q) ||
				u.designation.toLowerCase().includes(q) ||
				u.department.toLowerCase().includes(q)
		);
	});

	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const paged = $derived(filtered.slice((page - 1) * pageSize, page * pageSize));

	function onAction(
		action: 'deactivate' | 'reactivate' | 'roles' | 'manager' | 'permissions' | 'unlock',
		user: UserDto
	) {
		targetUser = user;
		switch (action) {
			case 'deactivate':
				deactivateOpen = true;
				break;
			case 'reactivate':
				reactivate.mutate(user.membership_id);
				break;
			case 'unlock':
				unlock.mutate(user.membership_id);
				break;
			case 'roles':
				rolesOpen = true;
				break;
			case 'manager':
				managerOpen = true;
				break;
			case 'permissions':
				permsOpen = true;
				break;
		}
	}
</script>

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Team</h1>
			<p class="caption text-fg-muted">
				{userList.length} member{userList.length === 1 ? '' : 's'}
			</p>
		</div>
		<div class="cluster">
			<input
				type="search"
				placeholder="Search by name, email, role…"
				value={search}
				oninput={(e) => setSearch((e.currentTarget as HTMLInputElement).value)}
				class="glass-input w-64 rounded-md px-3 py-2 text-sm"
			/>
			<Button onclick={() => (createOpen = true)}>
				<Icon icon={Plus} size="sm" /> Add member
			</Button>
		</div>
	</header>

	{#if listQuery.isPending}
		<div class="flex justify-center py-16"><Spinner size={32} /></div>
	{:else if listQuery.isError}
		<Alert variant="danger" title="Couldn't load members">{listQuery.error?.message}</Alert>
	{:else if filtered.length === 0}
		<EmptyState
			icon={UsersIcon}
			title={search ? 'No matches' : 'No team members yet'}
			description={search
				? 'Try a different search term.'
				: 'Invite your first member to start collaborating.'}
		>
			{#snippet action()}
				{#if !search}
					<Button onclick={() => (createOpen = true)}>
						<Icon icon={UserPlus} size="sm" /> Add member
					</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<ul class="stack stack-tight" aria-label="Team members">
			{#each paged as user (user.membership_id)}
				<UserListRow {user} roles={roleList} allUsers={userList} {onAction} />
			{/each}
		</ul>
		<Pagination {page} {pageCount} onChange={setPage} />
	{/if}
</div>

<CreateUserDrawer {tenantId} bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<DeactivateUserDialog
	{tenantId}
	bind:open={deactivateOpen}
	user={targetUser}
	onOpenChange={(o) => (deactivateOpen = o)}
/>
<RoleAssignmentDrawer
	{tenantId}
	{roleList}
	bind:open={rolesOpen}
	user={targetUser}
	onOpenChange={(o) => (rolesOpen = o)}
/>
<ManagerSelectorDrawer
	{tenantId}
	{userList}
	bind:open={managerOpen}
	user={targetUser}
	onOpenChange={(o) => (managerOpen = o)}
/>
<PermissionOverridesPanel
	{tenantId}
	bind:open={permsOpen}
	user={targetUser}
	onOpenChange={(o) => (permsOpen = o)}
/>
