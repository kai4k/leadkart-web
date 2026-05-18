<script lang="ts">
	import { Alert, Button, EmptyState, Pagination, Spinner } from '$ui';
	import { Plus, UserPlus, Users as UsersIcon, Icon } from '$icons';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';
	import UserListRow from './UserListRow.svelte';
	import CreateUserDrawer from './CreateUserDrawer.svelte';
	import DeactivateUserDialog from './DeactivateUserDialog.svelte';
	import RoleAssignmentDrawer from './RoleAssignmentDrawer.svelte';
	import ManagerSelectorDrawer from './ManagerSelectorDrawer.svelte';
	import PermissionOverridesPanel from './PermissionOverridesPanel.svelte';

	let createOpen = $state(false);
	let deactivateOpen = $state(false);
	let rolesOpen = $state(false);
	let managerOpen = $state(false);
	let permsOpen = $state(false);
	let targetUser = $state<UserDto | null>(null);

	let search = $state('');
	let page = $state(1);
	const pageSize = 10;

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return users.list;
		return users.list.filter(
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
				users.reactivate(user.membership_id).catch(() => {});
				break;
			case 'unlock':
				users.unlock(user.membership_id).catch(() => {});
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
			<p class="caption text-[var(--color-fg-muted)]">
				{users.list.length} member{users.list.length === 1 ? '' : 's'}
			</p>
		</div>
		<div class="cluster">
			<input
				type="search"
				placeholder="Search by name, email, role…"
				bind:value={search}
				class="glass-input w-64 rounded-md px-3 py-2 text-sm"
			/>
			<Button onclick={() => (createOpen = true)}>
				<Icon icon={Plus} size="sm" /> Add member
			</Button>
		</div>
	</header>

	{#if users.status === 'loading'}
		<div class="flex justify-center py-16"><Spinner size={32} /></div>
	{:else if users.status === 'error' && users.error}
		<Alert variant="danger" title="Couldn't load members">{users.error}</Alert>
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
				<UserListRow {user} {onAction} />
			{/each}
		</ul>
		<Pagination {page} {pageCount} onChange={(p) => (page = p)} />
	{/if}
</div>

<CreateUserDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<DeactivateUserDialog
	bind:open={deactivateOpen}
	user={targetUser}
	onOpenChange={(o) => (deactivateOpen = o)}
/>
<RoleAssignmentDrawer
	bind:open={rolesOpen}
	user={targetUser}
	onOpenChange={(o) => (rolesOpen = o)}
/>
<ManagerSelectorDrawer
	bind:open={managerOpen}
	user={targetUser}
	onOpenChange={(o) => (managerOpen = o)}
/>
<PermissionOverridesPanel
	bind:open={permsOpen}
	user={targetUser}
	onOpenChange={(o) => (permsOpen = o)}
/>
