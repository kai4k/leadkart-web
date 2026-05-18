<script lang="ts">
	import { Alert, Badge, Button, Card, EmptyState, Pagination, Spinner, Dropdown } from '$ui';
	import { Plus, Shield, MoreVertical, Trash2, Edit, Icon } from '$icons';
	import { roles } from '$features/roles/stores/roles.svelte';
	import { usersListQuery } from '$features/users/queries';
	import type { RoleDto } from '$features/roles/types';
	import { roleBadgeVariant, isProtectedRole, roleMemberCount } from '$features/roles/view-models';
	import CreateRoleDrawer from './CreateRoleDrawer.svelte';
	import DeleteRoleDialog from './DeleteRoleDialog.svelte';

	let createOpen = $state(false);
	let deleteOpen = $state(false);
	let targetRole = $state<RoleDto | null>(null);

	let page = $state(1);
	const pageSize = 10;
	const pageCount = $derived(Math.max(1, Math.ceil(roles.list.length / pageSize)));
	const paged = $derived(roles.list.slice((page - 1) * pageSize, page * pageSize));

	// Users list query — only to derive member counts per role.
	const usersQuery = usersListQuery();
	const userList = $derived(usersQuery.data?.users ?? []);

	function onDelete(role: RoleDto) {
		targetRole = role;
		deleteOpen = true;
	}
</script>

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Roles</h1>
			<p class="caption text-[var(--color-fg-muted)]">
				{roles.list.length} role{roles.list.length === 1 ? '' : 's'}
			</p>
		</div>
		<Button onclick={() => (createOpen = true)}>
			<Icon icon={Plus} size="sm" /> Create role
		</Button>
	</header>

	{#if roles.status === 'loading'}
		<div class="flex justify-center py-16"><Spinner size={32} /></div>
	{:else if roles.status === 'error' && roles.error}
		<Alert variant="danger" title="Couldn't load roles">{roles.error}</Alert>
	{:else if roles.list.length === 0}
		<EmptyState
			icon={Shield}
			title="No roles yet"
			description="Roles bundle permissions for easy assignment to team members."
		>
			{#snippet action()}
				<Button onclick={() => (createOpen = true)}>
					<Icon icon={Plus} size="sm" /> Create role
				</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<ul class="stack stack-tight" aria-label="Roles">
			{#each paged as role (role.id)}
				{@const badge = roleBadgeVariant(role)}
				{@const memberCount = roleMemberCount(role, userList)}
				<li>
					<Card.Root>
						<Card.Content class="grid grid-cols-[1fr_auto_auto] items-center gap-4">
							<div class="stack stack-tight">
								<div class="cluster cluster-tight">
									<a
										href="/settings/roles/{role.id}"
										class="h5 text-[var(--color-fg)] hover:underline">{role.name}</a
									>
									<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
								</div>
								<p class="caption text-[var(--color-fg-muted)]">
									{memberCount} member{memberCount === 1 ? '' : 's'} · {role.permissions.length} permission{role
										.permissions.length === 1
										? ''
										: 's'} · level {role.hierarchy_level}
								</p>
							</div>
							<Dropdown.Root>
								<Dropdown.Trigger>
									<Button variant="ghost" size="sm" aria-label="Row actions">
										<Icon icon={MoreVertical} size="sm" />
									</Button>
								</Dropdown.Trigger>
								<Dropdown.Menu>
									<Dropdown.Item>
										<a href="/settings/roles/{role.id}" class="cluster cluster-tight">
											<Icon icon={Edit} size="sm" /> Edit
										</a>
									</Dropdown.Item>
									{#if !isProtectedRole(role)}
										<Dropdown.Separator />
										<Dropdown.Item variant="danger" onSelect={() => onDelete(role)}>
											<Icon icon={Trash2} size="sm" /> Delete
										</Dropdown.Item>
									{/if}
								</Dropdown.Menu>
							</Dropdown.Root>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>
		<Pagination {page} {pageCount} onChange={(p) => (page = p)} />
	{/if}
</div>

<CreateRoleDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<DeleteRoleDialog bind:open={deleteOpen} role={targetRole} onOpenChange={(o) => (deleteOpen = o)} />
