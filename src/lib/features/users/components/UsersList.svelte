<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURL } from 'svelte/reactivity';
	import type { ResolvedPathname } from '$app/types';
	import { Badge, Button, buttonVariants, EmptyState } from '$ui';
	import { Plus, Shield, UserMinus, UserPlus, Users as UsersIcon, Users, Lock, Icon } from '$icons';
	import {
		usersListQuery,
		usersStatusCountsQuery,
		reactivateUserMutation,
		bulkUserStatusMutation
	} from '$features/users/queries';
	import type { UserStatusFilter } from '$features/users/api';
	import { rolesListQuery } from '$features/roles';
	import { userRoleBadges, canDeactivate, bulkTargets } from '$features/users/view-models';
	import { displayName, userStatus } from '$features/auth';
	import type { UserDto } from '$features/users/types';
	import {
		createBulkSelection,
		createDialogState,
		createListPagination,
		type ListSearch
	} from '#lib/hooks/index.ts';
	import {
		IdentityCell,
		ResourceListPage,
		RowActionsMenu,
		StatusChips,
		type BulkAction,
		type DataTableColumn,
		type RowAction
	} from '#lib/components/data/index.ts';
	import { DataTable } from '#lib/components/data/data-table/index.ts';
	import UsersTruncatedAlert from './UsersTruncatedAlert.svelte';
	import type { PolicyRules } from '#lib/features/auth/password-policy.ts';
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
	 *
	 * Nobody is ever deleted: a member is turned inactive and back. The list shows Active members by
	 * default, Inactive or All by the chips (Go's `?status=`, kept in the URL as `?status=inactive|all`).
	 *
	 * `passwordPolicy`: the policy of the company being managed when it is not the caller's own (an operator inside a tenant scope).
	 * `search`: the text typed in the box. It lives in the page (a member's name or email stays out of the URL bar; Back restores it).
	 */
	let {
		passwordPolicy,
		search: searchState
	}: { passwordPolicy?: PolicyRules; search: ListSearch } = $props();

	const createDialog = createDialogState();
	const deactivateDialog = createDialogState<UserDto>();
	const rolesDialog = createDialogState<UserDto>();
	const managerDialog = createDialogState<UserDto>();
	const permsDialog = createDialogState<UserDto>();
	// Each action shows when Go's route permission for it is held (one rule, `ACTION`).
	const may = createMemberPermissions();

	// Status and page are URL state; the search text is the page's own (see `search`).
	/** Go reads 100 bytes of a search; the box stops there. */
	const SEARCH_MAX = 100;
	const search = $derived(searchState.value.trim().slice(0, SEARCH_MAX));
	// Active unless the URL says otherwise: an unknown `?status=` reads as Active, never as an empty page.
	const statusFilter = $derived<UserStatusFilter>(
		page.url.searchParams.get('status') === 'inactive'
			? 'inactive'
			: page.url.searchParams.get('status') === 'all'
				? 'all'
				: 'active'
	);

	function setSearch(value: string) {
		searchState.value = value;
		const url = new SvelteURL(page.url.href);
		url.searchParams.delete('page');
		void goto(`${url.pathname}${url.search}` as ResolvedPathname, {
			replace: true,
			reset: false
		});
	}

	/** The chip that is on is Active or Inactive; none on is All. */
	function setStatusFilter(value: string | null) {
		const url = new SvelteURL(page.url.href);
		if (value === null) url.searchParams.set('status', 'all');
		else if (value === 'inactive') url.searchParams.set('status', 'inactive');
		else url.searchParams.delete('status');
		url.searchParams.delete('page');
		void goto(`${url.pathname}${url.search}` as ResolvedPathname, {
			replace: true,
			reset: false
		});
	}

	const listQuery = usersListQuery(
		() => true,
		() => statusFilter
	);
	const countsQuery = usersStatusCountsQuery(() => statusFilter);
	// the manager picker offers ACTIVE members whatever the list shows (the same cache entry while Active is shown)
	const rosterQuery = usersListQuery();
	const rolesQuery = rolesListQuery();
	const reactivate = reactivateUserMutation();
	const bulkStatus = bulkUserStatusMutation();

	// DataTable keys rows by getRowId, so the selection store keys on membership_id strings even though
	// UserDto carries no `id` field; the store's `{ id }` item type is only a type-level requirement.
	// Cleared when the search, the status filter or the PAGE changes: a bulk action must not reach members
	// that are not on screen (tick Ravi on page 1, press Next: Ravi is no longer shown).
	const selection = createBulkSelection<{ id: string }>(
		() => `${search}|${statusFilter}|${pagination.currentPage}`
	);

	// One mutation settles every id and toasts one summary. Succeeded rows leave the selection;
	// failed rows stay selected so the action can be retried. When every id failed the whole
	// selection stays (the global handler reports the error).
	async function runBulk(action: 'deactivate' | 'reactivate') {
		// only what is still listed and would change: a member already moved from a row menu, or already in that
		// state, is neither sent nor counted
		const { ids, unloaded } = bulkTargets(action, Array.from(selection.selected), userList);
		for (const id of unloaded) selection.selected.delete(id);
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
			// Nobody is deleted: the member stays under Inactive and can be turned back on.
			description:
				'Selected members lose access immediately. They stay under Inactive and can be reactivated.',
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
	// Only the bulk actions whose Go route permission is held, and only those that can apply to what is listed.
	const bulkActions: BulkAction[] = $derived([
		...(may.deactivate && statusFilter !== 'inactive' ? [deactivateBulk] : []),
		...(may.reactivate && statusFilter !== 'active' ? [reactivateBulk] : [])
	]);

	const userList = $derived(listQuery.data ?? []);
	const roleList = $derived(rolesQuery.data?.roles ?? []);
	const roster = $derived(rosterQuery.data ?? []);
	const counts = $derived(countsQuery.data);

	const statusOptions = $derived([
		{ value: 'active', label: 'Active', count: counts?.active },
		{ value: 'inactive', label: 'Inactive', count: counts?.inactive }
	]);

	const filtered = $derived.by(() => {
		const q = search.toLowerCase();
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

	const pagination = createListPagination(() => filtered);

	const columns: DataTableColumn<UserDto>[] = [
		{
			id: 'member',
			header: 'Member',
			accessor: (u) => displayName(u),
			cell: memberCell,
			primary: true
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
		switch (action) {
			case 'deactivate':
				deactivateDialog.show(user);
				break;
			case 'reactivate':
				reactivate.mutate(user.membership_id);
				break;
			case 'roles':
				rolesDialog.show(user);
				break;
			case 'manager':
				managerDialog.show(user);
				break;
			case 'permissions':
				permsDialog.show(user);
				break;
		}
	}

	/** The row's menu: icons on every item (all or none), the destructive one last. */
	function memberActions(user: UserDto): RowAction[] {
		const list: RowAction[] = [];
		if (may.manageRoles)
			list.push({
				id: 'roles',
				label: 'Manage roles',
				icon: Shield,
				onSelect: () => onAction('roles', user)
			});
		if (may.update)
			list.push({
				id: 'manager',
				label: 'Set manager',
				icon: Users,
				onSelect: () => onAction('manager', user)
			});
		if (may.overrides)
			list.push({
				id: 'permissions',
				label: 'Permission overrides',
				icon: Lock,
				onSelect: () => onAction('permissions', user)
			});
		if (may.deactivate && canDeactivate(user))
			list.push({
				id: 'deactivate',
				label: 'Deactivate',
				icon: UserMinus,
				variant: 'destructive',
				onSelect: () => onAction('deactivate', user)
			});
		else if (may.reactivate && user.status === 'inactive')
			list.push({
				id: 'reactivate',
				label: 'Reactivate',
				icon: UserPlus,
				onSelect: () => onAction('reactivate', user)
			});
		return list;
	}
</script>

{#snippet memberCell(user: UserDto)}
	<IdentityCell name={displayName(user)} subtitle={user.email} />
{/snippet}

{#snippet workCell(user: UserDto)}
	<div class="stack stack-tight">
		<span class="caption text-muted-foreground">{user.designation || '—'}</span>
		<span class="caption text-subtle-foreground">{user.department || '—'}</span>
	</div>
{/snippet}

{#snippet rolesCell(user: UserDto)}
	<div class="cluster cluster-tight">
		{#each userRoleBadges(user, roleList) as r (r.id)}
			<Badge variant="brand" size="sm">{r.name}</Badge>
		{/each}
	</div>
{/snippet}

{#snippet statusCell(user: UserDto)}
	{@const status = userStatus(user.status)}
	<Badge variant={status.variant} size="sm">{status.label}</Badge>
{/snippet}

{#snippet rowActions(user: UserDto)}
	{@const actions = memberActions(user)}
	{#if actions.length > 0}
		<RowActionsMenu label={displayName(user)} {actions} />
	{/if}
{/snippet}

{#snippet headerActions()}
	<a href={resolve('/(app)/settings/users/hierarchy')} class={buttonVariants({ variant: 'tonal' })}
		><Icon icon={Users} size="sm" /> Hierarchy</a
	>
{/snippet}

{#snippet chips()}
	<StatusChips
		label="Filter members by status"
		options={statusOptions}
		value={statusFilter === 'all' ? null : statusFilter}
		onChange={setStatusFilter}
	/>
{/snippet}

{#snippet empty()}
	<EmptyState
		icon={UsersIcon}
		title={search
			? 'No matches'
			: statusFilter === 'inactive'
				? 'No inactive members'
				: 'No team members yet'}
		description={search
			? 'Try a different search term.'
			: statusFilter === 'inactive'
				? 'Members you deactivate are listed here and can be reactivated.'
				: 'Invite your first member to start collaborating.'}
	>
		{#snippet action()}
			{#if !search && statusFilter !== 'inactive' && may.create}
				<Button onclick={() => createDialog.show()}
					><Icon icon={UserPlus} size="sm" /> Add member</Button
				>
			{/if}
		{/snippet}
	</EmptyState>
{/snippet}

<ResourceListPage
	title={$_('pages.team.title')}
	subtitle={$_('pages.team.count', { values: { count: userList.length } })}
	primaryAction={may.create
		? { label: 'Add member', icon: Plus as never, onClick: () => createDialog.show() }
		: undefined}
	{headerActions}
	search={{
		value: search,
		onSearch: setSearch,
		label: 'Search team members',
		placeholder: 'Search by name, email, role…',
		maxlength: SEARCH_MAX
	}}
	{chips}
	bulk={{ selection, actions: bulkActions }}
>
	<UsersTruncatedAlert count={userList.length} status={statusFilter} />

	<DataTable
		{columns}
		data={pagination.paged}
		getRowId={(u) => u.membership_id}
		rowHref={(u) => resolve('/(app)/settings/users/[id]', { id: u.membership_id })}
		noun="team members"
		caption="Team members"
		query={listQuery}
		selection={{ mode: 'multi', state: selection, rowLabel: (u) => `Select ${displayName(u)}` }}
		{rowActions}
		{empty}
		pagination={{
			mode: 'offset',
			page: pagination.currentPage,
			pageCount: pagination.pageCount,
			onPageChange: pagination.setPage
		}}
	/>
</ResourceListPage>

<CreateUserDrawer
	bind:open={createDialog.open}
	onOpenChange={createDialog.onOpenChange}
	{passwordPolicy}
/>

<DeactivateUserDialog
	bind:open={deactivateDialog.open}
	user={deactivateDialog.target}
	onOpenChange={deactivateDialog.onOpenChange}
/>
<RoleAssignmentDrawer
	{roleList}
	bind:open={rolesDialog.open}
	user={rolesDialog.target}
	onOpenChange={rolesDialog.onOpenChange}
/>
<ManagerSelectorDrawer
	userList={roster}
	{roleList}
	bind:open={managerDialog.open}
	user={managerDialog.target}
	onOpenChange={managerDialog.onOpenChange}
/>
<PermissionOverridesPanel
	bind:open={permsDialog.open}
	user={permsDialog.target}
	onOpenChange={permsDialog.onOpenChange}
/>
