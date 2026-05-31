<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
		reactivateUserMutation,
		deactivateUserMutation
	} from '$features/users/queries';
	import { userStatusBadge, userRoleBadges, canDeactivate } from '$features/users/view-models';
	import { displayName, initials } from '$features/auth/view-models';
	import type { UserDto } from '$features/users/types';
	import { getListErrorMessage } from '$api/errors';
	import { createBulkSelection, createListPagination } from '$lib/hooks';
	import { BulkActionBar, type BulkAction } from '$lib/components/data';
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
	const statusFilter = $derived(page.url.searchParams.get('status') ?? 'all');

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

	function setStatusFilter(value: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams.toString());
		if (value && value !== 'all') params.set('status', value);
		else params.delete('status');
		params.delete('page');
		goto(`?${params}`, { replaceState: true });
	}

	const listQuery = usersListQuery();
	const rolesQuery = rolesCatalogQuery();
	const reactivate = reactivateUserMutation();
	const deactivate = deactivateUserMutation();

	// DataTable normalises rows to `{ id }` at runtime via rowKey, so the
	// selection store keys on membership_id strings even though UserDto
	// doesn't carry an `id` field. The store contract requires SelectableItem
	// here for type-safety; the runtime store only ever sees the rowKey value.
	const selection = createBulkSelection<{ id: string }>();

	const bulkActions: BulkAction[] = [
		{
			id: 'deactivate',
			label: 'Deactivate',
			icon: UserMinus as never,
			variant: 'danger',
			confirm: {
				title: 'Deactivate selected members?',
				description:
					'Selected members lose access immediately. You can reactivate them later from this list.',
				confirmLabel: 'Deactivate'
			},
			onClick: async () => {
				const ids = Array.from(selection.selected);
				await Promise.all(
					ids.map(
						(id) =>
							new Promise<void>((resolve) => {
								deactivate.mutate(
									{ id, reason: 'Bulk deactivate' },
									{
										onSuccess: () => resolve(),
										onError: () => resolve()
									}
								);
							})
					)
				);
				selection.clear();
			}
		},
		{
			id: 'reactivate',
			label: 'Reactivate',
			icon: UserPlus as never,
			onClick: async () => {
				const ids = Array.from(selection.selected);
				await Promise.all(
					ids.map(
						(id) =>
							new Promise<void>((resolve) => {
								reactivate.mutate(id, {
									onSuccess: () => resolve(),
									onError: () => resolve()
								});
							})
					)
				);
				selection.clear();
			}
		}
	];

	const userList = $derived(listQuery.data?.users ?? []);
	const roleList = $derived(rolesQuery.data?.roles ?? []);

	const statusCounts = $derived.by(() => {
		const counts = { all: userList.length, active: 0, pending: 0, inactive: 0 };
		for (const u of userList) {
			if (u.status === 'active') counts.active++;
			else if (u.status === 'pending') counts.pending++;
			else if (u.status === 'inactive') counts.inactive++;
		}
		return counts;
	});

	const statusOptions = $derived([
		{ value: 'all', label: 'All', count: statusCounts.all },
		{ value: 'active', label: 'Active', count: statusCounts.active },
		{ value: 'pending', label: 'Pending', count: statusCounts.pending },
		{ value: 'inactive', label: 'Inactive', count: statusCounts.inactive }
	] as const);

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const byStatus =
			statusFilter === 'all' ? userList : userList.filter((u) => u.status === statusFilter);
		if (!q) return byStatus;
		return byStatus.filter(
			(u) =>
				u.email.toLowerCase().includes(q) ||
				u.first_name.toLowerCase().includes(q) ||
				u.last_name.toLowerCase().includes(q) ||
				u.designation.toLowerCase().includes(q) ||
				u.department.toLowerCase().includes(q)
		);
	});

	const pagination = createListPagination(() => filtered);

	const tableState = $derived(
		listQuery.isPending
			? 'loading'
			: listQuery.isError
				? 'error'
				: pagination.paged.length === 0
					? 'empty'
					: 'ready'
	);

	const listErrorCopy = $derived(getListErrorMessage(listQuery.error, 'team members'));

	const columns: DataTableColumn<UserDto>[] = [
		{
			id: 'select',
			header: '',
			selectLabel: (u) => `Select ${displayName(u)}`
		},
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
			<Badge variant="brand" appearance="soft" size="sm">{r.name}</Badge>
		{/each}
	</div>
{/snippet}

{#snippet statusCell(user: UserDto)}
	{@const status = userStatusBadge(user.status)}
	<Badge variant={status.variant} appearance="soft" size="sm">{status.label}</Badge>
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
				class="bg-bg-elevated border border-border rounded-md w-64 rounded-md px-3 py-2 text-sm"
			/>
			<Button variant="tonal" onclick={() => goto(resolve('/settings/users/hierarchy'))}>
				<Icon icon={Users} size="sm" /> Hierarchy
			</Button>
			<Button onclick={() => (createOpen = true)}>
				<Icon icon={Plus} size="sm" /> Add member
			</Button>
		</div>
	</header>

	<nav class="cluster cluster-tight" aria-label="Filter members by status">
		{#each statusOptions as opt (opt.value)}
			{@const active = statusFilter === opt.value}
			<button
				type="button"
				onclick={() => setStatusFilter(opt.value)}
				aria-pressed={active}
				class="label inline-flex items-center gap-2 rounded-full px-3 py-1 transition-colors {active
					? 'bg-primary text-primary-fg'
					: 'bg-bg-muted text-fg-muted hover:text-fg'}"
			>
				{opt.label}
				<span class="caption tabular-nums opacity-70">{opt.count}</span>
			</button>
		{/each}
	</nav>

	<DataTable.Root
		{columns}
		rows={pagination.paged}
		rowKey={(u) => u.membership_id}
		state={tableState}
		error={listErrorCopy}
		{selection}
		onRowClick={(u) => goto(resolve(`/settings/users/${u.membership_id}`))}
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

	<Pagination
		page={pagination.currentPage}
		pageCount={pagination.pageCount}
		onChange={pagination.setPage}
	/>

	<BulkActionBar {selection} actions={bulkActions} />
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
