<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Alert, Avatar, Badge, Breadcrumbs, Button, Dropdown, Skeleton } from '$ui';
	import type { BreadcrumbItem } from '$ui';
	import { Icon, Lock, MoreVertical, Shield, UserMinus, UserPlus, Users } from '$icons';
	import {
		userDetailQuery,
		usersListQuery,
		rolesCatalogQuery,
		reactivateUserMutation
	} from '$features/users/queries';
	import { userStatusBadge } from '$features/users/view-models';
	import { displayName, initials } from '$features/auth/view-models';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';
	import DeactivateUserDialog from '$features/users/components/DeactivateUserDialog.svelte';
	import RoleAssignmentDrawer from '$features/users/components/RoleAssignmentDrawer.svelte';
	import ManagerSelectorDrawer from '$features/users/components/ManagerSelectorDrawer.svelte';
	import PermissionOverridesPanel from '$features/users/components/PermissionOverridesPanel.svelte';
	import UserDetailTabs from '$features/users/components/UserDetailTabs.svelte';

	const membershipId = $derived(page.params.id ?? '');
	const tab = $derived(page.url.searchParams.get('tab') ?? 'overview');

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'identity.users.view')) {
			goto('/dashboard', { replaceState: true });
		}
	});

	const userQuery = userDetailQuery(() => membershipId);
	const usersListQ = usersListQuery();
	const rolesQuery = rolesCatalogQuery();

	const user = $derived(userQuery.data ?? null);
	const userList = $derived(usersListQ.data?.users ?? []);
	const roleList = $derived(rolesQuery.data?.roles ?? []);

	const status = $derived(user ? userStatusBadge(user.status) : null);

	const breadcrumbs = $derived<BreadcrumbItem[]>([
		{ href: '/settings', label: 'Settings' },
		{ href: '/settings/users', label: 'Team' },
		{ label: user ? displayName(user) : '…' }
	]);

	let deactivateOpen = $state(false);
	let rolesOpen = $state(false);
	let managerOpen = $state(false);
	let permsOpen = $state(false);

	const reactivate = reactivateUserMutation();

	function setTab(name: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams.toString());
		if (name === 'overview') params.delete('tab');
		else params.set('tab', name);
		const qs = params.toString();
		goto(qs ? `?${qs}` : page.url.pathname, { replaceState: true, keepFocus: true });
	}
</script>

<svelte:head>
	<title>{user ? displayName(user) : 'Member'} · Team · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />

	{#if userQuery.isPending}
		<div class="stack stack-relaxed" aria-busy="true" aria-label="Loading member">
			<Skeleton class="h-12 w-1/3" />
			<Skeleton class="h-32 w-full rounded-md" />
			<Skeleton class="h-48 w-full rounded-md" />
		</div>
	{:else if userQuery.isError}
		<Alert variant="danger" title="Could not load member">
			{userQuery.error?.message ?? 'Something went wrong. Please try again.'}
		</Alert>
	{:else if user && status}
		<header class="cluster cluster-spread items-start">
			<div class="cluster cluster-tight items-start">
				<Avatar initials={initials(user)} size="lg" />
				<div class="stack stack-tight">
					<div class="cluster cluster-tight">
						<h1 class="h2">{displayName(user)}</h1>
						<Badge variant={status.variant} appearance="soft">{status.label}</Badge>
					</div>
					<p class="body-sm text-fg-muted">{user.email}</p>
					{#if user.designation || user.department}
						<p class="caption text-fg-subtle">
							{user.designation || '—'} · {user.department || '—'}
						</p>
					{/if}
				</div>
			</div>

			<Dropdown.Root>
				<Dropdown.Trigger>
					<Button variant="tonal" size="sm">
						<Icon icon={MoreVertical} size="sm" /> Actions
					</Button>
				</Dropdown.Trigger>
				<Dropdown.Menu>
					<Dropdown.Item onclick={() => (rolesOpen = true)}>
						<Icon icon={Shield} size="sm" /> Manage roles
					</Dropdown.Item>
					<Dropdown.Item onclick={() => (managerOpen = true)}>
						<Icon icon={Users} size="sm" /> Set manager
					</Dropdown.Item>
					<Dropdown.Item onclick={() => (permsOpen = true)}>
						<Icon icon={Lock} size="sm" /> Permission overrides
					</Dropdown.Item>
					<Dropdown.Separator />
					{#if user.status === 'active'}
						<Dropdown.Item variant="danger" onclick={() => (deactivateOpen = true)}>
							<Icon icon={UserMinus} size="sm" /> Deactivate
						</Dropdown.Item>
					{:else if user.status === 'inactive'}
						<Dropdown.Item onclick={() => reactivate.mutate(user.membership_id)}>
							<Icon icon={UserPlus} size="sm" /> Reactivate
						</Dropdown.Item>
					{/if}
				</Dropdown.Menu>
			</Dropdown.Root>
		</header>

		<UserDetailTabs
			{user}
			roster={userList}
			roles={roleList}
			{tab}
			onTabChange={setTab}
			onManageRoles={() => (rolesOpen = true)}
			onManageManager={() => (managerOpen = true)}
			onManagePerms={() => (permsOpen = true)}
		/>
	{/if}
</div>

<DeactivateUserDialog
	bind:open={deactivateOpen}
	{user}
	onOpenChange={(o) => (deactivateOpen = o)}
/>
<RoleAssignmentDrawer
	{roleList}
	bind:open={rolesOpen}
	{user}
	onOpenChange={(o) => (rolesOpen = o)}
/>
<ManagerSelectorDrawer
	{userList}
	bind:open={managerOpen}
	{user}
	onOpenChange={(o) => (managerOpen = o)}
/>
<PermissionOverridesPanel bind:open={permsOpen} {user} onOpenChange={(o) => (permsOpen = o)} />
