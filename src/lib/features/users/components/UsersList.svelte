<script lang="ts">
	import { page } from '$app/state';
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
		Icon
	} from '$icons';
	import {
		usersListQuery,
		rolesCatalogQuery,
		reactivateUserMutation
	} from '$features/users/queries';
	import { userStatusBadge, userRoleBadges, canDeactivate } from '$features/users/view-models';
	import { displayName, initials } from '$features/auth/view-models';
	import type { UserDto } from '$features/users/types';
	import { AuthError, NetworkError } from '$api/errors';
	import CreateUserDrawer from './CreateUserDrawer.svelte';
	import DeactivateUserDialog from './DeactivateUserDialog.svelte';
	import RoleAssignmentDrawer from './RoleAssignmentDrawer.svelte';
	import ManagerSelectorDrawer from './ManagerSelectorDrawer.svelte';
	import PermissionOverridesPanel from './PermissionOverridesPanel.svelte';

	/**
	 * Tenant scope is set by the BFF via the lk_op_tenant cookie. When
	 * an operator is inside /operator/scope/*, the cookie is present and
	 * the proxy auto-injects X-Tenant-Id for every API call. When absent,
	 * the caller's JWT tenant scope applies (tenant-admin /settings/users).
	 * The frontend never sees, sends, or knows the tenant identifier.
	 */
	let createOpen = $state(false);
	let deactivateOpen = $state(false);
	let rolesOpen = $state(false);
	let managerOpen = $state(false);
	let permsOpen = $state(false);
	let targetUser = $state<UserDto | null>(null);

	// URL-driven filter state.
	const search = $derived(page.url.searchParams.get('q') ?? '');
	const currentPage = $derived(Number(page.url.searchParams.get('page') ?? '1') || 1);
	const pageSize = 10;

	function setSearch(value: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams.toString());
		if (value) {
			params.set('q', value);
		} else {
			params.delete('q');
		}
		params.delete('page');
		goto(`?${params}`, { replaceState: true, keepFocus: true });
	}

	function setPage(p: number) {
		const params = new SvelteURLSearchParams(page.url.searchParams.toString());
		if (p > 1) {
			params.set('page', String(p));
		} else {
			params.delete('page');
		}
		goto(`?${params}`, { replaceState: true });
	}

	const listQuery = usersListQuery();
	const rolesQuery = rolesCatalogQuery();
	const reactivate = reactivateUserMutation();

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
	const paged = $derived(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize));

	const tableState = $derived(
		listQuery.isPending
			? 'loading'
			: listQuery.isError
				? 'error'
				: paged.length === 0
					? 'empty'
					: 'ready'
	);

	const listErrorCopy = $derived.by(() => {
		const err = listQuery.error;
		if (!err) return null;
		if (err instanceof NetworkError) return 'Check your network connection and try again.';
		if (err instanceof AuthError)
			return err.status === 403
				? "You don't have permission to view users."
				: 'Your session expired. Sign in again.';
		return 'Something went wrong. Please try again.';
	});

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
		action: 'deactivate' | 'reactivate' | 'roles' | 'manager' | 'permissions',
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
		error={listErrorCopy}
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

	<Pagination page={currentPage} {pageCount} onChange={setPage} />
</div>

<CreateUserDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<DeactivateUserDialog
	bind:open={deactivateOpen}
	user={targetUser}
	onOpenChange={(o) => (deactivateOpen = o)}
/>
<RoleAssignmentDrawer
	{roleList}
	bind:open={rolesOpen}
	user={targetUser}
	onOpenChange={(o) => (rolesOpen = o)}
/>
<ManagerSelectorDrawer
	{userList}
	bind:open={managerOpen}
	user={targetUser}
	onOpenChange={(o) => (managerOpen = o)}
/>
<PermissionOverridesPanel
	bind:open={permsOpen}
	user={targetUser}
	onOpenChange={(o) => (permsOpen = o)}
/>
