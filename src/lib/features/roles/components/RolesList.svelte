<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Badge, Button, DataTable, Dropdown, EmptyState, Pagination } from '$ui';
	import type { DataTableColumn } from '$ui';
	import { Plus, Shield, MoreVertical, Trash2, Edit, Icon } from '$icons';
	import { rolesListQuery } from '$features/roles/queries';
	import { usersListQuery } from '$features/users/queries';
	import type { RoleDto } from '$features/roles/types';
	import { roleBadgeVariant, isProtectedRole, roleMemberCount } from '$features/roles/view-models';
	import { AuthError, NetworkError } from '$api/errors';
	import CreateRoleDrawer from './CreateRoleDrawer.svelte';
	import DeleteRoleDialog from './DeleteRoleDialog.svelte';

	let createOpen = $state(false);
	let deleteOpen = $state(false);
	let targetRole = $state<RoleDto | null>(null);

	// URL-driven pagination.
	const currentPage = $derived(Number(page.url.searchParams.get('page') ?? '1') || 1);
	const pageSize = 10;

	function setPage(p: number) {
		const params = new SvelteURLSearchParams(page.url.searchParams.toString());
		if (p > 1) {
			params.set('page', String(p));
		} else {
			params.delete('page');
		}
		goto(`?${params}`, { replaceState: true });
	}

	const rolesQuery = rolesListQuery();
	const usersQuery = usersListQuery();

	const roleList = $derived(rolesQuery.data?.roles ?? []);
	const userList = $derived(usersQuery.data?.users ?? []);
	const pageCount = $derived(Math.max(1, Math.ceil(roleList.length / pageSize)));
	const paged = $derived(roleList.slice((currentPage - 1) * pageSize, currentPage * pageSize));

	const tableState = $derived(
		rolesQuery.isPending
			? 'loading'
			: rolesQuery.isError
				? 'error'
				: paged.length === 0
					? 'empty'
					: 'ready'
	);

	const listErrorCopy = $derived.by(() => {
		const err = rolesQuery.error;
		if (!err) return null;
		if (err instanceof NetworkError) return 'Check your network connection and try again.';
		if (err instanceof AuthError)
			return err.status === 403
				? "You don't have permission to view roles."
				: 'Your session expired. Sign in again.';
		return 'Something went wrong. Please try again.';
	});

	const columns: DataTableColumn<RoleDto>[] = [
		{
			id: 'name',
			header: 'Role',
			accessor: 'name',
			cell: nameCell
		},
		{
			id: 'type',
			header: 'Type',
			accessor: (r) =>
				r.is_super_admin ? 'superadmin' : r.is_system_default ? 'system' : 'custom',
			cell: typeCell
		},
		{
			id: 'members',
			header: 'Members',
			accessor: (r) => roleMemberCount(r, userList),
			hideBelow: 'md'
		},
		{
			id: 'permissions',
			header: 'Permissions',
			accessor: (r) => r.permissions.length,
			hideBelow: 'sm'
		},
		{
			id: 'level',
			header: 'Hierarchy',
			accessor: 'hierarchy_level',
			hideBelow: 'lg'
		}
	];

	function onDelete(role: RoleDto) {
		targetRole = role;
		deleteOpen = true;
	}
</script>

{#snippet nameCell(role: RoleDto)}
	<a href="/settings/roles/{role.id}" class="text-fg hover:text-primary font-medium hover:underline"
		>{role.name}</a
	>
{/snippet}

{#snippet typeCell(role: RoleDto)}
	{@const badge = roleBadgeVariant(role)}
	<Badge variant={badge.variant} appearance="soft" size="sm">{badge.label}</Badge>
{/snippet}

{#snippet rowActions(role: RoleDto)}
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
{/snippet}

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Roles</h1>
			<p class="caption text-fg-muted">
				{roleList.length} role{roleList.length === 1 ? '' : 's'}
			</p>
		</div>
		<Button onclick={() => (createOpen = true)}>
			<Icon icon={Plus} size="sm" /> Create role
		</Button>
	</header>

	<DataTable.Root
		{columns}
		rows={paged}
		rowKey={(r) => r.id}
		state={tableState}
		error={listErrorCopy}
		{rowActions}
	>
		{#snippet emptyState()}
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
		{/snippet}
	</DataTable.Root>

	<Pagination page={currentPage} {pageCount} onChange={setPage} />
</div>

<CreateRoleDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<DeleteRoleDialog bind:open={deleteOpen} role={targetRole} onOpenChange={(o) => (deleteOpen = o)} />
