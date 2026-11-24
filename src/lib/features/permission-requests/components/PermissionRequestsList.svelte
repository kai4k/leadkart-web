<script lang="ts">
	import { createDialogState, useUrlTab } from '#lib/hooks/index.ts';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import { _ } from 'svelte-i18n';
	import { resolve } from '$app/paths';
	import { Badge, Button, EmptyState, Tabs } from '#lib/components/ui/index.ts';
	import { Icon, Inbox, Plus } from '#lib/icons/index.ts';
	import type { DataTableColumn } from '#lib/components/data/index.ts';
	import { DataTable } from '#lib/components/data/data-table/index.ts';
	import { permissionRequestsInfiniteQuery } from '#lib/features/permission-requests/queries.ts';
	import { formatDate } from '#lib/utils/format.ts';
	import {
		permissionRequestState,
		daysOrIndefinite
	} from '#lib/features/permission-requests/view-models.ts';
	import type { PermissionRequestDto } from '#lib/features/permission-requests/schemas.ts';
	import type { ListRole } from '#lib/features/permission-requests/api.ts';
	import { ACTION, session } from '#lib/features/auth/index.ts';
	import CreatePermissionRequestDrawer from './CreatePermissionRequestDrawer.svelte';

	/**
	 * PermissionRequestsList — inbox + history of permission-elevation
	 * requests. Tabs across `requester` (my requests) and `approver`
	 * (queue waiting on my decision).
	 */
	// Only the two inboxes Go knows: a typo in the URL is the default inbox, not a 400. `?role=` keeps its name.
	const tab = useUrlTab('requester', ['requester', 'approver'], 'role');
	const role = $derived(tab.value as ListRole);

	const list = permissionRequestsInfiniteQuery(() => role);

	const createDialog = createDialogState();
	// Go: submitting needs identity.meta.request_permission_elevation.
	const maySubmit = $derived(session.canAny(...ACTION.requestSubmit));

	const columns: DataTableColumn<PermissionRequestDto>[] = [
		{
			id: 'permission',
			header: 'Permission',
			accessor: (r) => r.permission,
			cell: permissionCell,
			primary: true
		},
		{
			id: 'reason',
			header: 'Reason',
			accessor: (r) => r.reason,
			class: 'max-w-3xl truncate'
		},
		{
			id: 'duration',
			header: 'Duration',
			accessor: (r) => daysOrIndefinite(r.duration_days),
			hideBelow: 'md'
		},
		{
			id: 'state',
			header: 'State',
			accessor: (r) => r.state,
			cell: stateCell
		},
		{
			id: 'created',
			header: 'Submitted',
			accessor: (r) => r.created_at,
			hideBelow: 'lg',
			cell: dateCell
		}
	];
</script>

{#snippet permissionCell(req: PermissionRequestDto)}
	<code class="caption">{req.permission}</code>
{/snippet}

{#snippet stateCell(req: PermissionRequestDto)}
	{@const b = permissionRequestState(req.state)}
	<Badge variant={b.variant} size="sm">{b.label}</Badge>
{/snippet}

{#snippet dateCell(req: PermissionRequestDto)}
	<span class="caption text-muted-foreground">{formatDate(req.created_at)}</span>
{/snippet}

{#snippet empty()}
	<EmptyState
		icon={Inbox}
		title={role === 'approver' ? 'Inbox zero' : 'No requests yet'}
		description={role === 'approver'
			? 'No requests are waiting on your decision.'
			: 'Submit a request to ask for a time-bound elevated permission.'}
	>
		{#snippet action()}
			{#if role === 'requester' && maySubmit}
				<Button onclick={() => createDialog.show()}
					><Icon icon={Plus} size="sm" /> Request permission</Button
				>
			{/if}
		{/snippet}
	</EmptyState>
{/snippet}

<div class="stack stack-relaxed">
	<PageHeader
		title={$_('pages.permissionRequests.title')}
		description={$_('pages.permissionRequests.description')}
	>
		{#snippet actions()}
			{#if maySubmit}
				<Button onclick={() => createDialog.show()}
					><Icon icon={Plus} size="sm" /> Request permission</Button
				>
			{/if}
		{/snippet}
	</PageHeader>

	<Tabs.Root value={tab.value} onValueChange={tab.set}>
		<Tabs.List aria-label="Request scope">
			<Tabs.Trigger value="requester">My requests</Tabs.Trigger>
			<Tabs.Trigger value="approver">Awaiting my decision</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value={tab.value} class="pt-4">
			<DataTable
				{columns}
				data={list.items}
				getRowId={(r) => r.id}
				rowHref={(r) => resolve('/(app)/permission-requests/[id]', { id: r.id })}
				noun="permission requests"
				caption="Permission requests"
				{empty}
				pagination={{ mode: 'cursor', list }}
			/>
		</Tabs.Content>
	</Tabs.Root>
</div>

<CreatePermissionRequestDrawer
	bind:open={createDialog.open}
	onOpenChange={createDialog.onOpenChange}
/>
