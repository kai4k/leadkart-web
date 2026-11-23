<script lang="ts">
	import PageHeader from '$layouts/PageHeader.svelte';
	import { _ } from 'svelte-i18n';
	import { Badge, buttonVariants, EmptyState } from '$ui';
	import { Plus, Shield, Trash2, Edit, Icon } from '$icons';
	import {
		RowActionsMenu,
		type DataTableColumn,
		type RowAction
	} from '#lib/components/data/index.ts';
	import { DataTable } from '#lib/components/data/data-table/index.ts';
	import { rolesListQuery } from '$features/roles/queries';
	import type { RoleDto } from '$features/roles/types';
	import {
		roleKind,
		roleKindKey,
		isProtectedRole,
		roleMemberCount
	} from '$features/roles/view-models';
	import { createDialogState, createListPagination } from '#lib/hooks/index.ts';
	import { resolve } from '$app/paths';
	import DeleteRoleDialog from './DeleteRoleDialog.svelte';
	import { createRolePermissions } from '../role-permissions.svelte.ts';

	/** `null` = the caller may not list members: no count is shown rather than a false 0. */
	let { roster }: { roster: ReadonlyArray<{ role_ids: string[]; status: string }> | null } =
		$props();

	const deleteDialog = createDialogState<RoleDto>();
	const may = createRolePermissions();

	const rolesQuery = rolesListQuery();

	const roleList = $derived(rolesQuery.data?.roles ?? []);
	const pagination = createListPagination(() => roleList);

	const columns: DataTableColumn<RoleDto>[] = $derived([
		{ id: 'name', header: 'Role', accessor: (r: RoleDto) => r.name, primary: true },
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
			accessor: (r: RoleDto) => r.hierarchy_level,
			hideBelow: 'lg' as const
		}
	]);

	function onDelete(role: RoleDto) {
		deleteDialog.show(role);
	}

	/** Edit (or View) is a link, so it is the menu item itself and not a link inside one. */
	function roleActions(role: RoleDto): RowAction[] {
		const list: RowAction[] = [
			{
				id: 'edit',
				label: may.update ? 'Edit' : 'View',
				icon: Edit,
				href: resolve('/(app)/settings/roles/[id]', { id: role.id })
			}
		];
		if (may.delete && !isProtectedRole(role))
			list.push({
				id: 'delete',
				label: 'Delete',
				icon: Trash2,
				variant: 'destructive',
				onSelect: () => onDelete(role)
			});
		return list;
	}
</script>

{#snippet typeCell(role: RoleDto)}
	{@const badge = roleKind(roleKindKey(role))}
	<Badge variant={badge.variant} size="sm">{badge.label}</Badge>
{/snippet}

{#snippet empty()}
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

{#snippet rowActions(role: RoleDto)}
	<RowActionsMenu label={role.name} actions={roleActions(role)} />
{/snippet}

<div class="stack stack-relaxed">
	<PageHeader
		title={$_('pages.roles.title')}
		description={$_('pages.roles.count', { values: { count: roleList.length } })}
	>
		{#snippet actions()}
			{#if may.create}
				<a href={resolve('/(app)/settings/roles/new')} class={buttonVariants()}
					><Icon icon={Plus} size="sm" /> Create role</a
				>
			{/if}
		{/snippet}
	</PageHeader>

	<DataTable
		{columns}
		data={pagination.paged}
		getRowId={(r) => r.id}
		rowHref={(r) => resolve('/(app)/settings/roles/[id]', { id: r.id })}
		noun="roles"
		caption="Roles"
		query={rolesQuery}
		{rowActions}
		{empty}
		pagination={{
			mode: 'offset',
			page: pagination.currentPage,
			pageCount: pagination.pageCount,
			onPageChange: pagination.setPage
		}}
	/>
</div>

<DeleteRoleDialog
	bind:open={deleteDialog.open}
	role={deleteDialog.target}
	onOpenChange={deleteDialog.onOpenChange}
/>
