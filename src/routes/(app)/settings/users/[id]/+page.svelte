<script lang="ts">
	import { createDialogState } from '#lib/hooks/index.ts';
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { _ } from 'svelte-i18n';
	import PageHeader from '$layouts/PageHeader.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURL } from 'svelte/reactivity';
	import type { ResolvedPathname } from '$app/types';
	import { Avatar, Badge, Dropdown, Skeleton } from '$ui';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { Icon, Lock, MoreVertical, Shield, UserMinus, UserPlus, Users } from '$icons';
	import { userDetailQuery, usersListQuery, reactivateUserMutation } from '$features/users/queries';
	import { rolesListQuery } from '$features/roles';
	import { displayName, initials, userStatus } from '$features/auth/view-models';
	import {
		DeactivateUserDialog,
		RoleAssignmentDrawer,
		ManagerSelectorDrawer,
		PermissionOverridesPanel,
		UserDetailTabs,
		createMemberPermissions
	} from '$features/users';

	const membershipId = $derived(page.params.id ?? '');
	const tab = $derived(page.url.searchParams.get('tab') ?? 'overview');

	const userQuery = userDetailQuery(() => membershipId);
	const usersListQ = usersListQuery();
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

	function setTab(name: string) {
		const url = new SvelteURL(page.url.href);
		if (name === 'overview') url.searchParams.delete('tab');
		else url.searchParams.set('tab', name);
		void goto(`${url.pathname}${url.search}` as ResolvedPathname, {
			replace: true,
			reset: false
		});
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
					<Avatar initials={initials(displayName(user))} size="lg" />
					<div class="stack stack-tight">
						<p class="body-sm text-muted-foreground">{user.email}</p>
						{#if user.designation || user.department}
							<p class="caption text-subtle-foreground">
								{user.designation || '—'} · {user.department || '—'}
							</p>
						{/if}
					</div>
				</div>

				{#if may.manageRoles || may.update || may.overrides || (may.deactivate && user.status === 'active') || (may.reactivate && user.status === 'inactive')}
					<Dropdown.Root>
						<Dropdown.Trigger variant="tonal" size="sm">
							<Icon icon={MoreVertical} size="sm" /> Actions
						</Dropdown.Trigger>
						<Dropdown.Menu>
							{#if may.manageRoles}
								<Dropdown.Item onclick={() => rolesDialog.show()}
									><Icon icon={Shield} size="sm" /> Manage roles</Dropdown.Item
								>
							{/if}
							{#if may.update}
								<Dropdown.Item onclick={() => managerDialog.show()}
									><Icon icon={Users} size="sm" /> Set manager</Dropdown.Item
								>
							{/if}
							{#if may.overrides}
								<Dropdown.Item onclick={() => permsDialog.show()}>
									<Icon icon={Lock} size="sm" />
									Permission overrides
								</Dropdown.Item>
							{/if}

							{#if (may.manageRoles || may.update || may.overrides) && ((may.deactivate && user.status === 'active') || (may.reactivate && user.status === 'inactive'))}
								<Dropdown.Separator />
							{/if}
							{#if may.deactivate && user.status === 'active'}
								<Dropdown.Item variant="danger" onclick={() => deactivateDialog.show()}
									><Icon icon={UserMinus} size="sm" /> Deactivate</Dropdown.Item
								>
							{:else if may.reactivate && user.status === 'inactive'}
								<Dropdown.Item onclick={() => reactivate.mutate(user.membership_id)}>
									<Icon icon={UserPlus} size="sm" /> Reactivate
								</Dropdown.Item>
							{/if}
						</Dropdown.Menu>
					</Dropdown.Root>
				{/if}
			</header>

			<UserDetailTabs
				{user}
				roster={userList}
				roles={roleList}
				{tab}
				onTabChange={setTab}
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
	bind:open={managerDialog.open}
	{user}
	onOpenChange={managerDialog.onOpenChange}
/>

<PermissionOverridesPanel
	bind:open={permsDialog.open}
	{user}
	onOpenChange={permsDialog.onOpenChange}
/>
