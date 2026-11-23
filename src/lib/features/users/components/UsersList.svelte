<script lang="ts">
	import { confirmLeave } from '#lib/hooks/use-leave-guard.svelte.ts';
	import PageHeader from '$layouts/PageHeader.svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURL } from 'svelte/reactivity';
	import type { ResolvedPathname } from '$app/types';
	import { Badge, Button, buttonVariants, DataTable, EmptyState, type DataTableColumn } from '$ui';
	import Pagination from '#lib/components/data/Pagination.svelte';
	import { Plus, Shield, UserMinus, UserPlus, Users as UsersIcon, Users, Lock, Icon } from '$icons';
	import {
		usersListQuery,
		reactivateUserMutation,
		bulkUserStatusMutation
	} from '$features/users/queries';
	import { rolesListQuery } from '$features/roles';
	import { userRoleBadges, canDeactivate } from '$features/users/view-models';
	import { displayName, userStatus } from '$features/auth';
	import type { UserDto } from '$features/users/types';
	import { getListErrorMessage } from '$api/error-messages';
	import {
		createBulkSelection,
		createDialogState,
		createListPagination,
		type ListSearch
	} from '#lib/hooks/index.ts';
	import {
		BulkActionBar,
		IdentityCell,
		RowActionsMenu,
		SearchInput,
		type BulkAction,
		type RowAction
	} from '#lib/components/data/index.ts';
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
	 */
	/** The policy of the company being managed when it is not the caller's own (an operator inside a tenant scope). */
	/** `search`: the text typed in the box. It lives in the page (a member's name or email stays out of the URL bar; Back restores it). */
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
	// only a filter this list offers: an unknown `?status=` or an old `?status=inactive` link reads as "all",
	// never as an empty page that says nobody is on the team
	const statusFilter = $derived(
		page.url.searchParams.get('status') === 'active' ? 'active' : 'all'
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
	// cleared when the search, the status filter or the PAGE changes: a bulk action must not reach members that
	// are not on screen (tick Ravi on page 1, press Next: Ravi is no longer shown)
	const selection = createBulkSelection<{ id: string }>(
		() => `${search}|${statusFilter}|${pagination.currentPage}`
	);

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
			// Go lists active members only: a deactivated member leaves this list (no promise of a way back from here).
			description:
				'Selected members lose access immediately. Deactivated members are not shown in this list.',
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

	// No "Inactive" chip: Go's `GET /v1/users` returns active members only (`memberships.sql`), so the chip could only
	// ever read 0. It comes back with Go's `?status=inactive`.
	const statusOptions = $derived([
		{ value: 'all', label: 'All', count: userList.length },
		{
			value: 'active',
			label: 'Active',
			count: userList.filter((u) => u.status === 'active').length
		}
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

<div class="stack stack-relaxed">
	<PageHeader
		title={$_('pages.team.title')}
		description={$_('pages.team.count', { values: { count: userList.length } })}
	>
		{#snippet actions()}
			<div class="cluster">
				<div class="w-64">
					<SearchInput
						value={search}
						onSearch={setSearch}
						label="Search team members"
						placeholder="Search by name, email, role…"
						maxlength={SEARCH_MAX}
					/>
				</div>

				<a
					href={resolve('/(app)/settings/users/hierarchy')}
					class={buttonVariants({ variant: 'tonal' })}><Icon icon={Users} size="sm" /> Hierarchy</a
				>

				{#if may.create}
					<Button onclick={() => createDialog.show()}
						><Icon icon={Plus} size="sm" /> Add member</Button
					>
				{/if}
			</div>
		{/snippet}
	</PageHeader>

	<UsersTruncatedAlert count={userList.length} />

	<nav class="cluster cluster-tight" aria-label="Filter members by status">
		{#each statusOptions as opt (opt.value)}
			{@const active = statusFilter === opt.value}
			<button
				type="button"
				onclick={() => setStatusFilter(opt.value)}
				aria-pressed={active}
				class="label inline-flex items-center gap-2 rounded-full px-3 py-1 transition-colors {active
					? 'bg-primary text-primary-foreground'
					: 'bg-muted text-muted-foreground hover:text-foreground'}"
			>
				{opt.label}
				<span class="caption tabular-nums">{opt.count}</span>
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
		onRowClick={(u) => {
			if (confirmLeave()) goto(resolve('/(app)/settings/users/[id]', { id: u.membership_id }));
		}}
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
						<Button onclick={() => createDialog.show()}
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
	{userList}
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
