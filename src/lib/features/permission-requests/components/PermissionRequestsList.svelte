<script lang="ts">
	import PageHeader from '$layouts/PageHeader.svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURL } from 'svelte/reactivity';
	import type { ResolvedPathname } from '$app/types';
	import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '$ui';
	import { Icon, Inbox, Plus } from '$icons';
	import { InfiniteListFooter } from '#lib/components/data/index.ts';
	import { permissionRequestsInfiniteQuery } from '$features/permission-requests/queries';
	import { formatDate } from '#lib/utils/format.ts';
	import {
		permissionRequestState,
		daysOrIndefinite
	} from '$features/permission-requests/view-models';
	import type { PermissionRequestDto } from '$features/permission-requests/schemas';
	import type { ListRole } from '$features/permission-requests/api';
	import { getListErrorMessage } from '$api/error-messages';
	import { ACTION, session } from '$features/auth';
	import CreatePermissionRequestDrawer from './CreatePermissionRequestDrawer.svelte';

	/**
	 * PermissionRequestsList — inbox + history of permission-elevation
	 * requests. Tabs across `requester` (my requests) and `approver`
	 * (queue waiting on my decision).
	 */
	const role = $derived<ListRole>(
		(page.url.searchParams.get('role') as ListRole | null) ?? 'requester'
	);

	const list = permissionRequestsInfiniteQuery(() => role);

	let createOpen = $state(false);
	// Go: submitting needs identity.meta.request_permission_elevation.
	const maySubmit = $derived(session.canAny(...ACTION.requestSubmit));

	function setRole(next: ListRole) {
		const url = new SvelteURL(page.url.href);
		if (next === 'requester') url.searchParams.delete('role');
		else url.searchParams.set('role', next);
		// not-a-guard: syncs the requester / approver tab into the URL
		void goto(`${url.pathname}${url.search}` as ResolvedPathname, {
			replace: true,
			reset: false
		});
	}

	const requests = $derived(list.items);

	const tableState = $derived(list.state === 'pending' ? 'loading' : list.state);

	const listErrorCopy = $derived(getListErrorMessage(list.query.error, 'permission requests'));

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
			accessor: 'created_at',
			hideBelow: 'lg',
			cell: dateCell
		}
	];

	function onRowClick(req: PermissionRequestDto) {
		// not-a-guard: opens the request row; capabilities only hide the request button
		goto(resolve('/(app)/permission-requests/[id]', { id: req.id }));
	}
</script>

{#snippet permissionCell(req: PermissionRequestDto)}
	<code class="caption text-foreground">{req.permission}</code>
{/snippet}

{#snippet stateCell(req: PermissionRequestDto)}
	{@const b = permissionRequestState(req.state)}
	<Badge variant={b.variant} size="sm">{b.label}</Badge>
{/snippet}

{#snippet dateCell(req: PermissionRequestDto)}
	<span class="caption text-muted-foreground">{formatDate(req.created_at)}</span>
{/snippet}

<div class="stack stack-relaxed">
	<PageHeader
		title={$_('pages.permissionRequests.title')}
		description={$_('pages.permissionRequests.description')}
	>
		{#snippet actions()}
			{#if maySubmit}
				<Button onclick={() => (createOpen = true)}
					><Icon icon={Plus} size="sm" /> Request permission</Button
				>
			{/if}
		{/snippet}
	</PageHeader>

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
							'focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
							'focus-visible:ring-ring',
							active
								? 'border-primary text-primary-text'
								: 'text-muted-foreground hover:text-foreground border-transparent'
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
		error={listErrorCopy}
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
					{#if role === 'requester' && maySubmit}
						<Button onclick={() => (createOpen = true)}
							><Icon icon={Plus} size="sm" /> Request permission</Button
						>
					{/if}
				{/snippet}
			</EmptyState>
		{/snippet}
	</DataTable.Root>

	<InfiniteListFooter {list} />
</div>

<CreatePermissionRequestDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
