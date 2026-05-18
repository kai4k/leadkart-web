<script lang="ts">
	import { page as pageStore } from '$app/stores';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Avatar, Badge, Button, DataTable, Dropdown, EmptyState, Pagination } from '$ui';
	import type { DataTableColumn } from '$ui';
	import {
		MoreVertical,
		Plus,
		Shield,
		UserMinus,
		UserPlus,
		Users as UsersIcon,
		Users,
		Lock,
		Unlock,
		Icon
	} from '$icons';
	import {
		usersListQuery,
		rolesCatalogQuery,
		reactivateUserMutation,
		unlockUserMutation
	} from '$features/users/queries';
	import { userStatusBadge, userRoleBadges, canDeactivate } from '$features/users/view-models';
	import { displayName, initials } from '$features/auth/view-models';
	import type { UserDto } from '$features/users/types';
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

	const tableState = $derived(
		listQuery.isPending
			? 'loading'
			: listQuery.isError
				? 'error'
				: paged.length === 0
					? 'empty'
					: 'ready'
	);

	const columns: DataTableColumn<UserDto>[] = [
		{
			id: 'member',
			header: 'Member',
			accessor: (u) => displayName(u),
			cell: memberCell
		},
		{
			id: 'work',
			header: 'Role / Dept',
			accessor: (u) => u.designation,
			hideBelow: 'md',
			cell: workCell
		},
		{
			id: 'roles',
			header: 'Roles',
			accessor: (u) => u.role_ids.length,
			cell: rolesCell
		},
		{
			id: 'status',
			header: 'Status',
			accessor: (u) => u.status,
			cell: statusCell
		}
	];

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

{#snippet memberCell(user: UserDto)}
	<div class="cluster cluster-tight">
		<Avatar initials={initials(user)} size="md" />
		<div class="stack stack-tight min-w-0">
			<span class="body-base text-fg truncate font-medium">{displayName(user)}</span>
			<span class="caption text-fg-muted truncate">{user.email}</span>
		</div>
	</div>
{/snippet}

{#snippet workCell(user: UserDto)}
	<div class="stack stack-tight">
		<span class="caption text-fg-muted">{user.designation || '—'}</span>
		<span class="caption text-fg-subtle">{user.department || '—'}</span>
	</div>
{/snippet}

{#snippet rolesCell(user: UserDto)}
	<div class="cluster cluster-tight">
		{#each userRoleBadges(user, roleList) as r (r.id)}
			<Badge variant="brand" style="soft" size="sm">{r.name}</Badge>
		{/each}
	</div>
{/snippet}

{#snippet statusCell(user: UserDto)}
	{@const status = userStatusBadge(user.status)}
	<Badge variant={status.variant} style="soft" size="sm">{status.label}</Badge>
{/snippet}

{#snippet rowActions(user: UserDto)}
	<Dropdown.Root>
		<Dropdown.Trigger>
			<Button variant="ghost" size="sm" aria-label="Row actions">
				<Icon icon={MoreVertical} size="sm" />
			</Button>
		</Dropdown.Trigger>
		<Dropdown.Menu>
			<Dropdown.Item onclick={() => onAction('roles', user)}>
				<Icon icon={Shield} size="sm" /> Manage roles
			</Dropdown.Item>
			<Dropdown.Item onclick={() => onAction('manager', user)}>
				<Icon icon={Users} size="sm" /> Set manager
			</Dropdown.Item>
			<Dropdown.Item onclick={() => onAction('permissions', user)}>
				<Icon icon={Lock} size="sm" /> Permission overrides
			</Dropdown.Item>
			<Dropdown.Separator />
			<Dropdown.Item onclick={() => onAction('unlock', user)}>
				<Icon icon={Unlock} size="sm" /> Unlock
			</Dropdown.Item>
			{#if canDeactivate(user)}
				<Dropdown.Item variant="danger" onclick={() => onAction('deactivate', user)}>
					<Icon icon={UserMinus} size="sm" /> Deactivate
				</Dropdown.Item>
			{:else if user.status === 'inactive'}
				<Dropdown.Item onclick={() => onAction('reactivate', user)}>
					<Icon icon={UserPlus} size="sm" /> Reactivate
				</Dropdown.Item>
			{/if}
		</Dropdown.Menu>
	</Dropdown.Root>
{/snippet}

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

	<DataTable.Root
		{columns}
		rows={paged}
		rowKey={(u) => u.membership_id}
		state={tableState}
		error={listQuery.error?.message}
		{rowActions}
	>
		{#snippet emptyState()}
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
		{/snippet}
	</DataTable.Root>

	<Pagination {page} {pageCount} onChange={setPage} />
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
