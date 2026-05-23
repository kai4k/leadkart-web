<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Badge, Button, DataTable, EmptyState } from '$ui';
	import type { DataTableColumn } from '$ui';
	import { Icon, Inbox, Plus } from '$icons';
	import { permissionRequestsListQuery } from '$features/permission-requests/queries';
	import { stateBadge, daysOrIndefinite } from '$features/permission-requests/view-models';
	import type { PermissionRequestDto } from '$features/permission-requests/schemas';
	import type { ListRole } from '$features/permission-requests/api';
	import CreatePermissionRequestDrawer from './CreatePermissionRequestDrawer.svelte';

	/**
	 * PermissionRequestsList — inbox + history of permission-elevation
	 * requests. Tabs across `requester` (my requests) and `approver`
	 * (queue waiting on my decision).
	 */

	const role = $derived<ListRole>(
		(page.url.searchParams.get('role') as ListRole | null) ?? 'requester'
	);
	const query = $derived(permissionRequestsListQuery(role));

	let createOpen = $state(false);

	function setRole(next: ListRole) {
		const params = new SvelteURLSearchParams(page.url.searchParams.toString());
		if (next === 'requester') params.delete('role');
		else params.set('role', next);
		goto(`?${params}`, { replaceState: true, keepFocus: true });
	}

	const requests = $derived(query.data?.requests ?? []);

	const tableState = $derived(
		query.isPending
			? 'loading'
			: query.isError
				? 'error'
				: requests.length === 0
					? 'empty'
					: 'ready'
	);

	const columns: DataTableColumn<PermissionRequestDto>[] = [
		{
			id: 'permission',
			header: 'Permission',
			accessor: 'permission',
			cell: permissionCell
		},
		{
			id: 'reason',
			header: 'Reason',
			accessor: 'reason',
			class: 'max-w-md truncate'
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
			accessor: 'created_at',
			hideBelow: 'lg',
			cell: dateCell
		}
	];

	function onRowClick(req: PermissionRequestDto) {
		goto(`/permission-requests/${req.id}`);
	}
</script>

{#snippet permissionCell(req: PermissionRequestDto)}
	<code class="caption text-fg">{req.permission}</code>
{/snippet}

{#snippet stateCell(req: PermissionRequestDto)}
	{@const b = stateBadge(req.state)}
	<Badge variant={b.variant} style="soft" size="sm">{b.label}</Badge>
{/snippet}

{#snippet dateCell(req: PermissionRequestDto)}
	<span class="caption text-fg-muted">{new Date(req.created_at).toLocaleDateString()}</span>
{/snippet}

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Permission requests</h1>
			<p class="caption text-fg-muted">
				Request time-bound elevated permissions; approve or deny requests waiting on you.
			</p>
		</div>
		<Button onclick={() => (createOpen = true)}>
			<Icon icon={Plus} size="sm" /> Request permission
		</Button>
	</header>

	<nav aria-label="Request scope" class="border-border border-b">
		<ul class="cluster gap-0" style="list-style:none;margin:0;padding:0;">
			{#each [{ role: 'requester' as ListRole, label: 'My requests' }, { role: 'approver' as ListRole, label: 'Awaiting my decision' }] as tab (tab.role)}
				{@const active = role === tab.role}
				<li>
					<button
						type="button"
						aria-current={active ? 'page' : undefined}
						onclick={() => setRole(tab.role)}
						class={[
							'label -mb-px inline-block border-b-2 px-4 py-2 transition-colors',
							'focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
							'focus-visible:ring-focus-ring',
							active
								? 'border-primary text-primary'
								: 'text-fg-muted hover:text-fg border-transparent'
						]}
					>
						{tab.label}
					</button>
				</li>
			{/each}
		</ul>
	</nav>

	<DataTable.Root
		{columns}
		rows={requests}
		rowKey={(r) => r.id}
		state={tableState}
		error={query.error?.message}
		{onRowClick}
	>
		{#snippet emptyState()}
			<EmptyState
				icon={Inbox}
				title={role === 'approver' ? 'Inbox zero' : 'No requests yet'}
				description={role === 'approver'
					? 'No requests are waiting on your decision.'
					: 'Submit a request to ask for a time-bound elevated permission.'}
			>
				{#snippet action()}
					{#if role === 'requester'}
						<Button onclick={() => (createOpen = true)}>
							<Icon icon={Plus} size="sm" /> Request permission
						</Button>
					{/if}
				{/snippet}
			</EmptyState>
		{/snippet}
	</DataTable.Root>
</div>

<CreatePermissionRequestDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
