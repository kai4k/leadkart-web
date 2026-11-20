<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURL } from 'svelte/reactivity';
	import type { ResolvedPathname } from '$app/types';
	import {
		Avatar,
		Badge,
		Button,
		buttonVariants,
		DataTable,
		Dropdown,
		EmptyState,
		Pagination,
		type DataTableColumn
	} from '$ui';
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
		reactivateUserMutation,
		bulkUserStatusMutation
	} from '$features/users/queries';
	import { rolesListQuery } from '$features/roles';
	import { userStatusBadge, userRoleBadges, canDeactivate } from '$features/users/view-models';
	import { displayName, initials } from '$features/auth';
	import type { UserDto } from '$features/users/types';
	import { getListErrorMessage } from '$api/error-messages';
	import { createBulkSelection, createListPagination } from '#lib/hooks/index.ts';
	import { BulkActionBar, type BulkAction } from '#lib/components/data/index.ts';
	import UsersTruncatedAlert from './UsersTruncatedAlert.svelte';
	import CreateUserDrawer from './CreateUserDrawer.svelte';
	import DeactivateUserDialog from './DeactivateUserDialog.svelte';
	import RoleAssignmentDrawer from './RoleAssignmentDrawer.svelte';
	import ManagerSelectorDrawer from './ManagerSelectorDrawer.svelte';
	import PermissionOverridesPanel from './PermissionOverridesPanel.svelte';
	import { createMemberPermissions } from '../member-permissions.svelte.ts';

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
	// Each action shows when Go's route permission for it is held (one rule, `ACTION`).
	const may = createMemberPermissions();

	// URL-driven filter state.
	const search = $derived(page.url.searchParams.get('q') ?? '');
	const statusFilter = $derived(page.url.searchParams.get('status') ?? 'all');

	function setSearch(value: string) {
		const url = new SvelteURL(page.url.href);
		if (value) url.searchParams.set('q', value);
		else url.searchParams.delete('q');
		url.searchParams.delete('page');
		void goto(`${url.pathname}${url.search}` as ResolvedPathname, {
			replace: true,
			reset: false
		});
	}

	function setStatusFilter(value: string) {
		const url = new SvelteURL(page.url.href);
		if (value && value !== 'all') url.searchParams.set('status', value);
		else url.searchParams.delete('status');
		url.searchParams.delete('page');
		void goto(`${url.pathname}${url.search}` as ResolvedPathname, { replace: true });
	}

	const listQuery = usersListQuery();
	const rolesQuery = rolesListQuery();
	const reactivate = reactivateUserMutation();
	const bulkStatus = bulkUserStatusMutation();

	// DataTable normalises rows to `{ id }` at runtime via rowKey, so the
	// selection store keys on membership_id strings even though UserDto
	// doesn't carry an `id` field. The store contract requires SelectableItem
	// here for type-safety; the runtime store only ever sees the rowKey value.
	const selection = createBulkSelection<{ id: string }>();

	// One mutation settles every id and toasts one summary. Succeeded rows leave the selection;
	// failed rows stay selected so the action can be retried. When every id failed the whole
	// selection stays (the global handler reports the error).
	async function runBulk(action: 'deactivate' | 'reactivate') {
		const ids = Array.from(selection.selected);
		if (ids.length === 0) return;
		try {
			const { failedIds } = await bulkStatus.mutateAsync({ action, ids });
			for (const id of ids) if (!failedIds.includes(id)) selection.selected.delete(id);
		} catch {
			// reported by the global mutation handler
		}
	}

	const deactivateBulk: BulkAction = {
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
		onClick: () => runBulk('deactivate')
	};
	const reactivateBulk: BulkAction = {
		id: 'reactivate',
		label: 'Reactivate',
		icon: UserPlus as never,
		onClick: () => runBulk('reactivate')
	};
	// Only the bulk actions whose Go route permission is held.
	const bulkActions: BulkAction[] = $derived([
		...(may.deactivate ? [deactivateBulk] : []),
		...(may.reactivate ? [reactivateBulk] : [])
	]);

	const userList = $derived(listQuery.data ?? []);
	const roleList = $derived(rolesQuery.data?.roles ?? []);

	const statusCounts = $derived.by(() => {
		const counts = { all: userList.length, active: 0, inactive: 0 };
		for (const u of userList) {
			if (u.status === 'active') counts.active++;
			else if (u.status === 'inactive') counts.inactive++;
		}
		return counts;
	});

	const statusOptions = $derived([
		{ value: 'all', label: 'All', count: statusCounts.all },
		{ value: 'active', label: 'Active', count: statusCounts.active },
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
		<Avatar initials={initials(displayName(user))} size="md" />
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
	{#if may.manageRoles || may.update || may.overrides || may.deactivate || may.reactivate}
		<Dropdown.Root>
			<Dropdown.Trigger variant="ghost" size="sm" aria-label="Row actions">
				<Icon icon={MoreVertical} size="sm" />
			</Dropdown.Trigger>
			<Dropdown.Menu>
				{#if may.manageRoles}
					<Dropdown.Item onclick={() => onAction('roles', user)}>
						<Icon icon={Shield} size="sm" /> Manage roles
					</Dropdown.Item>
				{/if}
				{#if may.update}
					<Dropdown.Item onclick={() => onAction('manager', user)}>
						<Icon icon={Users} size="sm" /> Set manager
					</Dropdown.Item>
				{/if}
				{#if may.overrides}
					<Dropdown.Item onclick={() => onAction('permissions', user)}>
						<Icon icon={Lock} size="sm" /> Permission overrides
					</Dropdown.Item>
				{/if}
				{#if (may.manageRoles || may.update || may.overrides) && ((may.deactivate && canDeactivate(user)) || (may.reactivate && user.status === 'inactive'))}
					<Dropdown.Separator />
				{/if}
				{#if may.deactivate && canDeactivate(user)}
					<Dropdown.Item variant="danger" onclick={() => onAction('deactivate', user)}>
						<Icon icon={UserMinus} size="sm" /> Deactivate
					</Dropdown.Item>
				{:else if may.reactivate && user.status === 'inactive'}
					<Dropdown.Item onclick={() => onAction('reactivate', user)}>
						<Icon icon={UserPlus} size="sm" /> Reactivate
					</Dropdown.Item>
				{/if}
			</Dropdown.Menu>
		</Dropdown.Root>
	{/if}
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

			<a
				href={resolve('/(app)/settings/users/hierarchy')}
				class={buttonVariants({ variant: 'tonal' })}><Icon icon={Users} size="sm" /> Hierarchy</a
			>

			{#if may.create}
				<Button onclick={() => (createOpen = true)}
					><Icon icon={Plus} size="sm" /> Add member</Button
				>
			{/if}
		</div>
	</header>

	<UsersTruncatedAlert count={userList.length} />

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
		onRowClick={(u) => goto(resolve('/(app)/settings/users/[id]', { id: u.membership_id }))}
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
					{#if !search && may.create}
						<Button onclick={() => (createOpen = true)}
							><Icon icon={UserPlus} size="sm" /> Add member</Button
						>
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
