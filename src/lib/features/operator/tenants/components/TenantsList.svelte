<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURL } from 'svelte/reactivity';
	import { Alert, Badge, Button, DataTable, Dropdown, EmptyState, Spinner } from '$ui';
	import type { DataTableColumn } from '$ui';
	import {
		Building2,
		Eye,
		MoreVertical,
		Pause,
		Play,
		Plus,
		RotateCcw,
		Search,
		Shield,
		Trash2,
		Icon
	} from '$icons';
	import {
		activateTenantMutation,
		restoreTenantMutation,
		tenantsListQuery
	} from '$features/operator/tenants/queries';
	import {
		canActivate,
		canMarkForDeletion,
		canRestore,
		canSuspend,
		tenantLifecycleBadge
	} from '$features/operator/tenants/view-models';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';
	import { AuthError, NetworkError, NotFoundError, getListErrorMessage } from '$api/errors';
	import { enterScopeMutation } from '$features/operator/scope';
	import CreateTenantDrawer from './CreateTenantDrawer.svelte';
	import SuspendDialog from './SuspendDialog.svelte';
	import MarkForDeletionDialog from './MarkForDeletionDialog.svelte';
	import ImpersonateModal from '$features/operator/impersonation/components/ImpersonateModal.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';
	import { createListPagination } from '$lib/hooks';

	const PAGE_SIZE = 10;

	let createOpen = $state(false);
	let suspendOpen = $state(false);
	let markOpen = $state(false);
	let lifecycleTarget = $state<TenantDto | null>(null);
	let impersonateOpen = $state(false);
	let impersonateTarget = $state<TenantDto | null>(null);
	/** Slug of the tenant currently being opened — drives the inline
	 *  row spinner and disables further row clicks while in flight. */
	let openingScopeSlug = $state<string | null>(null);

	const search = $derived(page.url.searchParams.get('q') ?? '');
	const statusFilter = $derived(page.url.searchParams.get('status') ?? 'all');

	function setStatusFilter(value: string) {
		const url = new SvelteURL(page.url);
		if (value && value !== 'all') url.searchParams.set('status', value);
		else url.searchParams.delete('status');
		url.searchParams.delete('page');
		void goto(url, { replaceState: true });
	}

	function setSearch(value: string) {
		const url = new SvelteURL(page.url);
		if (value) url.searchParams.set('q', value);
		else url.searchParams.delete('q');
		url.searchParams.delete('page');
		void goto(url, { replaceState: true, keepFocus: true });
	}

	const capsQuery = myCapabilitiesQuery();
	const canCreate = $derived(hasCapability(capsQuery.data, 'platform.tenants.create'));
	const canView = $derived(hasCapability(capsQuery.data, 'platform.tenants.view'));
	const canManage = $derived(hasCapability(capsQuery.data, 'platform.tenants.manage'));

	const query = tenantsListQuery();
	const activateMutation = activateTenantMutation();
	const restoreMutation = restoreTenantMutation();
	const enterMutation = enterScopeMutation();

	const filtered = $derived.by(() => {
		const all = query.data?.tenants ?? [];
		const q = search.trim().toLowerCase();
		const matched = q
			? all.filter(
					(t: TenantDto) =>
						t.slug.toLowerCase().includes(q) ||
						t.display_name.toLowerCase().includes(q) ||
						t.legal_name.toLowerCase().includes(q)
				)
			: all;
		const byStatus =
			statusFilter === 'all'
				? matched
				: matched.filter((t: TenantDto) => t.status === statusFilter);
		const platform = byStatus.find((t: TenantDto) => t.slug === 'platform');
		const rest = byStatus.filter((t: TenantDto) => t.slug !== 'platform');
		return platform ? [platform, ...rest] : rest;
	});

	const statusCounts = $derived.by(() => {
		const all = query.data?.tenants ?? [];
		const counts = { all: all.length, active: 0, suspended: 0, marked_for_deletion: 0, pending: 0 };
		for (const t of all) {
			if (t.status === 'active') counts.active++;
			else if (t.status === 'suspended') counts.suspended++;
			else if (t.status === 'marked_for_deletion') counts.marked_for_deletion++;
			else if (t.status === 'pending') counts.pending++;
		}
		return counts;
	});

	const statusOptions = $derived([
		{ value: 'all', label: 'All', count: statusCounts.all },
		{ value: 'active', label: 'Active', count: statusCounts.active },
		{ value: 'suspended', label: 'Suspended', count: statusCounts.suspended },
		{ value: 'pending', label: 'Pending', count: statusCounts.pending },
		{
			value: 'marked_for_deletion',
			label: 'Marked for deletion',
			count: statusCounts.marked_for_deletion
		}
	] as const);

	const pagination = createListPagination(() => filtered, { pageSize: PAGE_SIZE });

	const tableState = $derived(
		query.isPending
			? 'loading'
			: query.isError
				? 'error'
				: pagination.paged.length === 0
					? 'empty'
					: 'ready'
	);

	const listErrorCopy = $derived(getListErrorMessage(query.error, 'tenants'));

	const columns: DataTableColumn<TenantDto>[] = [
		{ id: 'name', header: 'Tenant', accessor: (t) => t.display_name, cell: nameCell },
		{
			id: 'slug',
			header: 'Slug',
			accessor: 'slug',
			hideBelow: 'md',
			class: 'text-fg-muted font-mono text-xs'
		},
		{ id: 'status', header: 'Status', accessor: (t) => t.status, cell: statusCell },
		{ id: 'legal', header: 'Legal name', accessor: 'legal_name', hideBelow: 'lg' }
	];

	function openImpersonate(tenant: TenantDto) {
		impersonateTarget = tenant;
		impersonateOpen = true;
	}

	/**
	 * Enter tenant context. POSTs the slug to the BFF, which resolves
	 * it server-side, stores the tenant identifier in the lk_op_tenant
	 * httpOnly cookie, and returns 204. Then we clear the TanStack cache
	 * (previous scope's data is no longer authoritative) and navigate
	 * to /operator/scope/profile — the URL never reveals which tenant
	 * the operator is acting on.
	 */
	function enterScope(tenant: TenantDto) {
		if (openingScopeSlug !== null) return; // a row is already in-flight
		openingScopeSlug = tenant.slug;
		enterMutation.mutate(
			{ slug: tenant.slug },
			{
				onSettled: () => {
					openingScopeSlug = null;
				}
			}
		);
	}
</script>

{#snippet nameCell(tenant: TenantDto)}
	<div class="cluster cluster-tight">
		{#if tenant.slug === 'platform'}
			<Icon icon={Shield} size="sm" class="text-primary" />
		{/if}
		<span class="text-fg font-medium">{tenant.display_name}</span>
		{#if tenant.slug === 'platform'}
			<Badge variant="brand" appearance="soft" size="sm">Platform</Badge>
		{/if}
	</div>
{/snippet}

{#snippet statusCell(tenant: TenantDto)}
	{@const badge = tenantLifecycleBadge(tenant)}
	<Badge variant={badge.variant} appearance="soft" size="sm">{badge.label}</Badge>
{/snippet}

{#snippet rowActions(tenant: TenantDto)}
	{#if openingScopeSlug === tenant.slug}
		<div class="cluster cluster-tight" aria-label="Opening {tenant.display_name}">
			<Spinner size={14} />
			<span class="caption text-fg-muted">Opening…</span>
		</div>
	{:else if tenant.slug !== 'platform'}
		<div class="cluster cluster-tight">
			{#if canView}
				<Button
					variant="ghost"
					size="sm"
					disabled={openingScopeSlug !== null}
					onclick={(e) => {
						e.stopPropagation();
						openImpersonate(tenant);
					}}
					aria-label="Impersonate {tenant.display_name}"
				>
					<Icon icon={Eye} size="sm" /> Impersonate
				</Button>
			{/if}
			{#if canManage}
				<Dropdown.Root>
					<Dropdown.Trigger>
						<Button
							variant="ghost"
							size="sm"
							aria-label="Lifecycle actions for {tenant.display_name}"
						>
							<Icon icon={MoreVertical} size="sm" />
						</Button>
					</Dropdown.Trigger>
					<Dropdown.Menu>
						{#if canSuspend(tenant)}
							<Dropdown.Item
								onclick={() => {
									lifecycleTarget = tenant;
									suspendOpen = true;
								}}
							>
								<Icon icon={Pause} size="sm" /> Suspend
							</Dropdown.Item>
						{/if}
						{#if canActivate(tenant)}
							<Dropdown.Item onclick={() => activateMutation.mutate(tenant.id)}>
								<Icon icon={Play} size="sm" /> Activate
							</Dropdown.Item>
						{/if}
						{#if canRestore(tenant)}
							<Dropdown.Item onclick={() => restoreMutation.mutate(tenant.id)}>
								<Icon icon={RotateCcw} size="sm" /> Restore
							</Dropdown.Item>
						{/if}
						{#if canMarkForDeletion(tenant)}
							<Dropdown.Separator />
							<Dropdown.Item
								variant="danger"
								onclick={() => {
									lifecycleTarget = tenant;
									markOpen = true;
								}}
							>
								<Icon icon={Trash2} size="sm" /> Mark for deletion
							</Dropdown.Item>
						{/if}
					</Dropdown.Menu>
				</Dropdown.Root>
			{/if}
		</div>
	{/if}
{/snippet}

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Tenants</h1>
			<p class="caption text-fg-muted">Operator-side tenant management.</p>
		</div>
		{#if canCreate}
			<Button onclick={() => (createOpen = true)}>
				<Icon icon={Plus} size="sm" /> Register tenant
			</Button>
		{/if}
	</header>

	<div class="stack stack-tight">
		<div class="cluster">
			<div class="relative flex-1">
				<span class="pointer-events-none absolute inset-y-0 start-3 flex items-center">
					<Icon icon={Search} size="sm" class="text-fg-subtle" />
				</span>
				<input
					type="search"
					placeholder="Filter by name, slug, or legal name"
					value={search}
					oninput={(e) => setSearch((e.currentTarget as HTMLInputElement).value)}
					class="bg-bg-elevated border border-border rounded-md w-full rounded-md py-2 ps-9 pe-3 text-sm"
					aria-label="Filter tenants"
				/>
			</div>
		</div>

		<nav class="cluster cluster-tight" aria-label="Filter tenants by lifecycle status">
			{#each statusOptions as opt (opt.value)}
				{@const active = statusFilter === opt.value}
				<button
					type="button"
					onclick={() => setStatusFilter(opt.value)}
					aria-pressed={active}
					class="label inline-flex items-center gap-2 rounded-full px-3 py-1 transition-colors {active
						? 'bg-primary text-primary-fg'
						: 'bg-bg-muted text-fg-muted hover:text-fg'}"
				>
					{opt.label}
					<span class="caption tabular-nums opacity-70">{opt.count}</span>
				</button>
			{/each}
		</nav>
	</div>

	<DataTable.Root
		{columns}
		rows={pagination.paged}
		rowKey={(t) => t.id}
		state={tableState}
		error={listErrorCopy}
		onRowClick={enterScope}
		{rowActions}
	>
		{#snippet emptyState()}
			{#if query.isError}
				{@const err = query.error}
				{#if err instanceof NetworkError}
					<Alert variant="warning" title="Connection problem">
						We couldn't reach the server. Check your network.
						<Button variant="ghost" size="sm" onclick={() => query.refetch()} class="mt-2"
							>Retry</Button
						>
					</Alert>
				{:else}
					<Alert variant="danger" title="Failed to load tenants">
						{#if err instanceof AuthError}
							{err.status === 403
								? "You don't have permission to view tenants."
								: 'Your session expired. Sign in again.'}
						{:else if err instanceof NotFoundError}
							This resource was deleted or moved.
						{:else}
							Something went wrong. Please try again.
						{/if}
						<Button variant="ghost" size="sm" onclick={() => query.refetch()} class="mt-2"
							>Retry</Button
						>
					</Alert>
				{/if}
			{:else}
				<EmptyState
					icon={Building2}
					title={search ? `No matches for '${search}'` : 'No tenants yet'}
					description={search
						? 'Try a different name or slug.'
						: 'Register the first one using the button above.'}
				>
					{#snippet action()}
						{#if !search && canCreate}
							<Button onclick={() => (createOpen = true)}>
								<Icon icon={Plus} size="sm" /> Register tenant
							</Button>
						{/if}
					{/snippet}
				</EmptyState>
			{/if}
		{/snippet}
	</DataTable.Root>

	{#if pagination.pageCount > 1}
		<nav class="cluster cluster-spread" aria-label="Tenant list pagination">
			<p class="caption text-fg-muted">
				{(pagination.currentPage - 1) * PAGE_SIZE + 1}–{Math.min(
					pagination.currentPage * PAGE_SIZE,
					filtered.length
				)} of {filtered.length}
			</p>
			<div class="cluster cluster-tight">
				<Button
					variant="ghost"
					size="sm"
					disabled={pagination.currentPage <= 1}
					onclick={() => pagination.setPage(pagination.currentPage - 1)}
					aria-label="Previous page"
				>
					← Prev
				</Button>
				<span class="caption">
					Page {pagination.currentPage} / {pagination.pageCount}
				</span>
				<Button
					variant="ghost"
					size="sm"
					disabled={pagination.currentPage >= pagination.pageCount}
					onclick={() => pagination.setPage(pagination.currentPage + 1)}
					aria-label="Next page"
				>
					Next →
				</Button>
			</div>
		</nav>
	{/if}
</div>

<CreateTenantDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<SuspendDialog
	bind:open={suspendOpen}
	tenant={lifecycleTarget}
	onOpenChange={(o) => (suspendOpen = o)}
/>
<MarkForDeletionDialog
	bind:open={markOpen}
	tenant={lifecycleTarget}
	onOpenChange={(o) => (markOpen = o)}
/>
<ImpersonateModal
	bind:open={impersonateOpen}
	tenant={impersonateTarget}
	onOpenChange={(o) => (impersonateOpen = o)}
/>
