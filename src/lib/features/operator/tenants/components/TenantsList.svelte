<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Badge, Button, EmptyState, Spinner } from '#lib/components/ui/index.ts';
	import { Building2, Eye, Pause, Play, Plus, Shield, Icon } from '#lib/icons/index.ts';
	import {
		ResourceListPage,
		RowActionsMenu,
		StatusChips,
		type DataTableColumn,
		type RowAction
	} from '#lib/components/data/index.ts';
	import { DataTable } from '#lib/components/data/data-table/index.ts';
	import { activateTenantMutation, tenantsListQuery } from '../queries';
	import { canActivate, canSuspend } from '../view-models';
	import { tenantStatus } from '#lib/features/tenant/index.ts';
	import { P, session } from '#lib/features/auth/index.ts';
	import { enterScopeMutation } from '#lib/features/operator/scope/index.ts';
	import { confirmLeave } from '#lib/hooks/use-leave-guard.svelte.ts';
	import CreateTenantDrawer from './CreateTenantDrawer.svelte';
	import SuspendDialog from './SuspendDialog.svelte';
	import { ImpersonateModal, impersonation } from '../../impersonation';
	import type { TenantDto } from '../types';
	import {
		createDialogState,
		createListPagination,
		createUrlFilters,
		type ListSearch
	} from '#lib/hooks/index.ts';

	/** The search text lives in the page (a tenant's name or slug stays out of the URL bar); Back restores it. */
	let { search: searchState }: { search: ListSearch } = $props();

	const PAGE_SIZE = 10;
	const STATUSES = ['active', 'suspended', 'pending'] as const;
	type Status = (typeof STATUSES)[number];
	/** Go cuts a search at 100 bytes; the box stops a little before. */
	const SEARCH_MAX = 100;

	const createDialog = createDialogState();
	const suspendDialog = createDialogState<TenantDto>();
	const impersonateDialog = createDialogState<TenantDto>();
	/** Slug of the tenant currently being opened: drives the inline row spinner and blocks a second open. */
	let openingScopeSlug = $state<string | null>(null);

	const urlFilters = createUrlFilters<{
		status: string | undefined;
		page: string | undefined;
	}>({
		status: { type: 'string', label: 'Status' },
		page: { type: 'string', label: 'Page' }
	});

	/** What is searched: trimmed, and as long as the box reads. */
	const search = $derived(searchState.value.trim().slice(0, SEARCH_MAX));
	/** A status the list knows, else none: an unknown `?status=` is "all", not an empty page. */
	const statusFilter = $derived<Status | null>(
		STATUSES.find((s) => s === urlFilters.filters.status) ?? null
	);

	// A changed search or status starts at page 1.
	function setStatusFilter(value: string | null) {
		urlFilters.setMany({ status: value ?? undefined, page: undefined });
	}
	function setSearch(value: string) {
		searchState.value = value;
		urlFilters.setMany({ page: undefined });
	}

	const canCreate = $derived(session.can(P.platformTenantsCreate));
	const canImpersonate = $derived(session.can(P.platformImpersonationManage));
	// One Go permission per lifecycle action (suspend, activate).
	const mayActivate = $derived(session.can(P.identityTenantsActivate));
	const maySuspend = $derived(session.can(P.identityTenantsSuspend));
	const canManage = $derived(maySuspend || mayActivate);

	const query = tenantsListQuery();
	const activateMutation = activateTenantMutation();
	const enterMutation = enterScopeMutation();

	const filtered = $derived.by(() => {
		const all = query.data?.tenants ?? [];
		const q = search.toLowerCase();
		const matched = q
			? all.filter(
					(t: TenantDto) =>
						t.slug.toLowerCase().includes(q) ||
						t.display_name.toLowerCase().includes(q) ||
						t.legal_name.toLowerCase().includes(q)
				)
			: all;
		const byStatus = statusFilter
			? matched.filter((t: TenantDto) => t.status === statusFilter)
			: matched;
		const platform = byStatus.find((t: TenantDto) => t.slug === 'platform');
		const rest = byStatus.filter((t: TenantDto) => t.slug !== 'platform');
		return platform ? [platform, ...rest] : rest;
	});

	const statusOptions = $derived.by(() => {
		const all = query.data?.tenants ?? [];
		const count = (s: Status) => all.filter((t: TenantDto) => t.status === s).length;
		return [
			{ value: 'active', label: 'Active', count: count('active') },
			{ value: 'suspended', label: 'Suspended', count: count('suspended') },
			{ value: 'pending', label: 'Pending', count: count('pending') }
		];
	});

	const openingTenant = $derived(
		openingScopeSlug === null
			? null
			: ((query.data?.tenants ?? []).find((t: TenantDto) => t.slug === openingScopeSlug) ?? null)
	);

	const pagination = createListPagination(() => filtered, { pageSize: PAGE_SIZE });

	const columns: DataTableColumn<TenantDto>[] = [
		{ id: 'name', header: 'Tenant', accessor: (t) => t.display_name, cell: nameCell },
		{
			id: 'slug',
			header: 'Slug',
			accessor: (t) => t.slug,
			hideBelow: 'md',
			class: 'text-muted-foreground font-mono text-xs'
		},
		{ id: 'status', header: 'Status', accessor: (t) => t.status, cell: statusCell },
		{ id: 'legal', header: 'Legal name', accessor: (t) => t.legal_name, hideBelow: 'lg' }
	];

	/** The tenant's lifecycle menu: suspend and activate. */
	function lifecycleActions(tenant: TenantDto): RowAction[] {
		const list: RowAction[] = [];
		if (maySuspend && canSuspend(tenant))
			list.push({
				id: 'suspend',
				label: 'Suspend',
				icon: Pause,
				onSelect: () => suspendDialog.show(tenant)
			});
		if (mayActivate && canActivate(tenant))
			list.push({
				id: 'activate',
				label: 'Activate',
				icon: Play,
				onSelect: () => activateMutation.mutate(tenant.id)
			});
		return list;
	}

	/**
	 * Enter tenant context. POSTs the slug to the BFF, which resolves it server-side, stores the
	 * tenant identifier in the lk_op_tenant httpOnly cookie, and answers 204. Then the cache is cleared
	 * (the previous scope's data is no longer authoritative) and the page goes to
	 * /operator/scope/profile: the URL never reveals which tenant the operator is acting on.
	 */
	function enterScope(tenant: TenantDto) {
		if (openingScopeSlug !== null) return; // a row is already in flight
		// a scope change resets everything mounted: unsaved work is asked about first (the palette does the same)
		if (!confirmLeave()) return;
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
			<Icon icon={Shield} size="sm" class="text-primary-text" />
		{/if}
		<!-- The row is not clickable; its name is the control that opens the tenant. -->
		<Button
			variant="link"
			class="h-auto p-0 font-medium"
			loading={openingScopeSlug === tenant.slug}
			focusableWhileLoading
			disabled={openingScopeSlug !== null && openingScopeSlug !== tenant.slug}
			onclick={() => enterScope(tenant)}
		>
			{tenant.display_name}
		</Button>
		{#if tenant.slug === 'platform'}
			<Badge variant="brand" size="sm">Platform</Badge>
		{/if}
	</div>
{/snippet}

{#snippet statusCell(tenant: TenantDto)}
	{@const badge = tenantStatus(tenant.status)}
	<Badge variant={badge.variant} size="sm">{badge.label}</Badge>
{/snippet}

{#snippet rowActions(tenant: TenantDto)}
	{#if openingScopeSlug === tenant.slug}
		<div class="cluster cluster-tight" aria-hidden="true">
			<Spinner size={14} />
			<span class="caption text-muted-foreground">Opening…</span>
		</div>
	{:else if tenant.slug !== 'platform'}
		<div class="cluster cluster-tight justify-end">
			{#if canImpersonate}
				<Button
					variant="ghost"
					size="sm"
					disabled={openingScopeSlug !== null ||
						impersonation.active !== null ||
						impersonation.status === 'mutating'}
					onclick={() => impersonateDialog.show(tenant)}
					aria-label="Impersonate {tenant.display_name}"
				>
					<Icon icon={Eye} size="sm" /> Impersonate
				</Button>
			{/if}
			{#if canManage}
				{@const actions = lifecycleActions(tenant)}
				{#if actions.length > 0}
					<RowActionsMenu label={tenant.display_name} {actions} />
				{/if}
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet empty()}
	<EmptyState
		icon={Building2}
		title={search || statusFilter ? 'No tenants match' : 'No tenants yet'}
		description={search || statusFilter
			? 'Try a different name, slug or status.'
			: 'Register the first one using the button above.'}
	>
		{#snippet action()}
			{#if !search && !statusFilter && canCreate}
				<Button onclick={() => createDialog.show()}>
					<Icon icon={Plus} size="sm" /> Register tenant
				</Button>
			{/if}
		{/snippet}
	</EmptyState>
{/snippet}

{#snippet chips()}
	<StatusChips
		label="Filter tenants by lifecycle status"
		options={statusOptions}
		value={statusFilter}
		onChange={setStatusFilter}
	/>
{/snippet}

<!-- a standing live region (one inserted with its text is often not read): what is being opened -->
<p class="sr-only" role="status">
	{openingTenant
		? $_('pages.tenants.opening', { values: { name: openingTenant.display_name } })
		: ''}
</p>

<ResourceListPage
	title={$_('pages.tenants.title')}
	subtitle={$_('pages.tenants.description')}
	primaryAction={canCreate
		? { label: 'Register tenant', icon: Plus as never, onClick: () => createDialog.show() }
		: undefined}
	search={{
		value: search,
		onSearch: setSearch,
		label: 'Filter tenants',
		placeholder: 'Filter by name, slug, or legal name',
		maxlength: SEARCH_MAX
	}}
	{chips}
>
	<DataTable
		{columns}
		data={pagination.paged}
		getRowId={(t) => t.id}
		noun="tenants"
		caption="Tenants"
		{query}
		{rowActions}
		{empty}
		pagination={{
			mode: 'offset',
			page: pagination.currentPage,
			pageCount: pagination.pageCount,
			onPageChange: pagination.setPage
		}}
	/>
</ResourceListPage>

<CreateTenantDrawer bind:open={createDialog.open} onOpenChange={createDialog.onOpenChange} />
<SuspendDialog
	bind:open={suspendDialog.open}
	tenant={suspendDialog.target}
	onOpenChange={suspendDialog.onOpenChange}
/>
<ImpersonateModal
	bind:open={impersonateDialog.open}
	tenant={impersonateDialog.target}
	onOpenChange={impersonateDialog.onOpenChange}
/>
