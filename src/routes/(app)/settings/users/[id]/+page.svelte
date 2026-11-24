<script lang="ts">
	import { createDialogState, useUrlTab } from '#lib/hooks/index.ts';
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { _ } from 'svelte-i18n';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import { page } from '$app/state';
	import { Badge, Skeleton } from '#lib/components/ui/index.ts';
	import { IdentityCell, RowActionsMenu, type RowAction } from '#lib/components/data/index.ts';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { Lock, Shield, UserMinus, UserPlus, Users } from '#lib/icons/index.ts';
	import {
		userDetailQuery,
		usersListQuery,
		reactivateUserMutation
	} from '#lib/features/users/queries.ts';
	import { rolesListQuery } from '#lib/features/roles/index.ts';
	import { displayName, userStatus } from '#lib/features/auth/view-models.ts';
	import {
		DeactivateUserDialog,
		RoleAssignmentDrawer,
		ManagerSelectorDrawer,
		PermissionOverridesPanel,
		UserDetailTabs,
		createMemberPermissions
	} from '#lib/features/users/index.ts';

	const membershipId = $derived(page.params.id ?? '');
	// An unknown `?tab=` is the first tab, not a blank panel.
	// (an old `?tab=activity` link too: that tab is gone until Go has a per-person audit feed)
	const urlTab = useUrlTab('overview', ['overview', 'permissions', 'reports']);
	const tab = $derived(urlTab.value);

	const userQuery = userDetailQuery(() => membershipId);
	// everyone, inactive included: nobody is deleted, so an inactive manager keeps a name and an inactive report stays
	// listed with its status. The manager PICKER still offers only active members (`eligibleManagers`).
	const usersListQ = usersListQuery(
		() => true,
		() => 'all'
	);
	const rolesQuery = rolesListQuery();

	const user = $derived(userQuery.data ?? null);
	const userList = $derived(usersListQ.data ?? []);
	const roleList = $derived(rolesQuery.data?.roles ?? []);

	const crumbs = $derived([
		{ label: $_('pages.crumbs.settings') },
		{ href: '/settings/users', label: $_('nav.items.team') },
		{ label: user ? displayName(user) : $_('pages.member.fallbackTitle') }
	]);

	const deactivateDialog = createDialogState();
	const rolesDialog = createDialogState();
	const managerDialog = createDialogState();
	const permsDialog = createDialogState();

	const reactivate = reactivateUserMutation();
	const may = createMemberPermissions();

	/** The member's menu: icons on every item, the destructive one last. */
	function memberActions(member: NonNullable<typeof user>): RowAction[] {
		const list: RowAction[] = [];
		if (may.manageRoles)
			list.push({
				id: 'roles',
				label: 'Manage roles',
				icon: Shield,
				onSelect: () => rolesDialog.show()
			});
		if (may.update)
			list.push({
				id: 'manager',
				label: 'Set manager',
				icon: Users,
				onSelect: () => managerDialog.show()
			});
		if (may.overrides)
			list.push({
				id: 'permissions',
				label: 'Permission overrides',
				icon: Lock,
				onSelect: () => permsDialog.show()
			});
		if (may.deactivate && member.status === 'active')
			list.push({
				id: 'deactivate',
				label: 'Deactivate',
				icon: UserMinus,
				variant: 'destructive',
				onSelect: () => deactivateDialog.show()
			});
		else if (may.reactivate && member.status === 'inactive')
			list.push({
				id: 'reactivate',
				label: 'Reactivate',
				icon: UserPlus,
				onSelect: () => reactivate.mutate(member.membership_id)
			});
		return list;
	}
</script>

<svelte:head>
	<title>{user ? plainTitle(displayName(user)) : 'Member'} · Team · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<PageHeader title={user ? displayName(user) : $_('pages.member.fallbackTitle')} {crumbs}>
		{#snippet meta()}
			{#if user}
				{@const status = userStatus(user.status)}
				<Badge variant={status.variant}>{status.label}</Badge>
			{/if}
		{/snippet}
	</PageHeader>

	<QueryState query={userQuery} noun="member">
		{#snippet skeleton()}
			<Skeleton class="h-12 w-1/3" />
			<Skeleton class="h-32 w-full rounded-md" />
			<Skeleton class="h-48 w-full rounded-md" />
		{/snippet}
		{#snippet children(user)}
			<header class="cluster cluster-spread items-start">
				<div class="cluster cluster-tight items-start">
					<div class="stack stack-tight">
						<IdentityCell name={displayName(user)} subtitle={user.email} />
						{#if user.designation || user.department}
							<p class="caption text-subtle-foreground">
								{user.designation || '—'} · {user.department || '—'}
							</p>
						{/if}
					</div>
				</div>

				{#if memberActions(user).length > 0}
					<RowActionsMenu label={displayName(user)} actions={memberActions(user)} />
				{/if}
			</header>

			<UserDetailTabs
				{user}
				roster={userList}
				roles={roleList}
				{tab}
				onTabChange={urlTab.set}
				onManageRoles={() => rolesDialog.show()}
				onManageManager={() => managerDialog.show()}
				onManagePerms={() => permsDialog.show()}
			/>
		{/snippet}
	</QueryState>
</div>

<DeactivateUserDialog
	bind:open={deactivateDialog.open}
	{user}
	onOpenChange={deactivateDialog.onOpenChange}
/>
<RoleAssignmentDrawer
	{roleList}
	bind:open={rolesDialog.open}
	{user}
	onOpenChange={rolesDialog.onOpenChange}
/>
<ManagerSelectorDrawer
	{userList}
	{roleList}
	bind:open={managerDialog.open}
	{user}
	onOpenChange={managerDialog.onOpenChange}
/>

<PermissionOverridesPanel
	bind:open={permsDialog.open}
	{user}
	onOpenChange={permsDialog.onOpenChange}
/>
