<script lang="ts">
	import {
		Badge,
		buttonVariants,
		DataTable,
		Dropdown,
		EmptyState,
		type DataTableColumn
	} from '$ui';
	import Pagination from '#lib/components/data/Pagination.svelte';
	import { Plus, Shield, MoreVertical, Trash2, Edit, Icon } from '$icons';
	import { rolesListQuery } from '$features/roles/queries';
	import type { RoleDto } from '$features/roles/types';
	import {
		roleKind,
		roleKindKey,
		isProtectedRole,
		roleMemberCount
	} from '$features/roles/view-models';
	import { getListErrorMessage } from '$api/error-messages';
	import { createListPagination } from '#lib/hooks/index.ts';
	import { resolve } from '$app/paths';
	import DeleteRoleDialog from './DeleteRoleDialog.svelte';
	import { createRolePermissions } from '../role-permissions.svelte.ts';

	/** `null` = the caller may not list members: no count is shown rather than a false 0. */
	let { roster }: { roster: ReadonlyArray<{ role_ids: string[]; status: string }> | null } =
		$props();

	let deleteOpen = $state(false);
	const may = createRolePermissions();
	let targetRole = $state<RoleDto | null>(null);

	const rolesQuery = rolesListQuery();

	const roleList = $derived(rolesQuery.data?.roles ?? []);
	const pagination = createListPagination(() => roleList);

	const tableState = $derived(
		rolesQuery.isPending
			? 'loading'
			: rolesQuery.isError
				? 'error'
				: pagination.paged.length === 0
					? 'empty'
					: 'ready'
	);

	const listErrorCopy = $derived(getListErrorMessage(rolesQuery.error, 'roles'));

	const columns: DataTableColumn<RoleDto>[] = $derived([
		{ id: 'name', header: 'Role', accessor: 'name', cell: nameCell },
		{
			id: 'type',
			header: 'Type',
			accessor: (r: RoleDto) =>
				r.is_super_admin ? 'superadmin' : r.is_system_default ? 'system' : 'custom',
			cell: typeCell
		},
		...(roster
			? [
					{
						id: 'members',
						header: 'Members',
						accessor: (r: RoleDto) => roleMemberCount(r, roster),
						hideBelow: 'md' as const
					}
				]
			: []),
		{
			id: 'permissions',
			header: 'Permissions',
			accessor: (r: RoleDto) => r.permissions.length,
			hideBelow: 'sm' as const
		},
		{
			id: 'level',
			header: 'Hierarchy',
			accessor: 'hierarchy_level' as const,
			hideBelow: 'lg' as const
		}
	]);

	function onDelete(role: RoleDto) {
		targetRole = role;
		deleteOpen = true;
	}
</script>

{#snippet nameCell(role: RoleDto)}
	<a
		href={resolve('/(app)/settings/roles/[id]', { id: role.id })}
		class="text-fg hover:text-primary font-medium hover:underline">{role.name}</a
	>
{/snippet}

{#snippet typeCell(role: RoleDto)}
	{@const badge = roleKind(roleKindKey(role))}
	<Badge variant={badge.variant} size="sm">{badge.label}</Badge>
{/snippet}

{#snippet rowActions(role: RoleDto)}
	<Dropdown.Root>
		<Dropdown.Trigger variant="ghost" size="sm" aria-label="Row actions">
			<Icon icon={MoreVertical} size="sm" />
		</Dropdown.Trigger>
		<Dropdown.Menu>
			<Dropdown.Item>
				<a
					href={resolve('/(app)/settings/roles/[id]', { id: role.id })}
					class="cluster cluster-tight"
					><Icon icon={Edit} size="sm" /> {may.update ? 'Edit' : 'View'}</a
				>
			</Dropdown.Item>
			{#if may.delete && !isProtectedRole(role)}
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
		{#if may.create}
			<a href={resolve('/(app)/settings/roles/new')} class={buttonVariants()}
				><Icon icon={Plus} size="sm" /> Create role</a
			>
		{/if}
	</header>

	<DataTable.Root
		{columns}
		rows={pagination.paged}
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
					{#if may.create}
						<a href={resolve('/(app)/settings/roles/new')} class={buttonVariants()}
							><Icon icon={Plus} size="sm" /> Create role</a
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
</div>

<DeleteRoleDialog bind:open={deleteOpen} role={targetRole} onOpenChange={(o) => (deleteOpen = o)} />
