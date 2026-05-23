<script lang="ts">
	import { page as pageStore } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Alert, Badge, Button, DataTable, EmptyState, Spinner } from '$ui';
	import type { DataTableColumn } from '$ui';
	import { Building2, Eye, Plus, Search, Shield, Icon } from '$icons';
	import { tenantsListQuery } from '$features/operator/tenants/queries';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';
	import { NetworkError } from '$lib/api/errors';
	import { getCsrfToken } from '$lib/api/csrf';
	import { toast } from '$ui';
	import CreateTenantDrawer from './CreateTenantDrawer.svelte';
	import ImpersonateModal from '$features/operator/impersonation/components/ImpersonateModal.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	const PAGE_SIZE = 10;

	let createOpen = $state(false);
	let impersonateOpen = $state(false);
	let impersonateTarget = $state<TenantDto | null>(null);
	/** Slug of the tenant currently being opened — drives the inline
	 *  row spinner and disables further row clicks while in flight. */
	let openingScopeSlug = $state<string | null>(null);

	const search = $derived($pageStore.url.searchParams.get('q') ?? '');
	const page = $derived(Number($pageStore.url.searchParams.get('page') ?? '1') || 1);

	function setSearch(value: string) {
		const params = new SvelteURLSearchParams($pageStore.url.searchParams.toString());
		if (value) params.set('q', value);
		else params.delete('q');
		params.delete('page');
		goto(`?${params}`, { replaceState: true, keepFocus: true });
	}

	function setPage(p: number) {
		const params = new SvelteURLSearchParams($pageStore.url.searchParams.toString());
		if (p > 1) params.set('page', String(p));
		else params.delete('page');
		goto(`?${params}`, { replaceState: true });
	}

	const capsQuery = myCapabilitiesQuery();
	const canCreate = $derived(hasCapability(capsQuery.data, 'platform.tenants.create'));
	const canView = $derived(hasCapability(capsQuery.data, 'platform.tenants.view'));

	const query = tenantsListQuery();
	const qc = useQueryClient();

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
		const platform = matched.find((t: TenantDto) => t.slug === 'platform');
		const rest = matched.filter((t: TenantDto) => t.slug !== 'platform');
		return platform ? [platform, ...rest] : rest;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
	const paged = $derived(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

	const tableState = $derived(
		query.isPending ? 'loading' : query.isError ? 'error' : paged.length === 0 ? 'empty' : 'ready'
	);

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
	async function enterScope(tenant: TenantDto) {
		if (openingScopeSlug !== null) return; // a row is already in-flight
		openingScopeSlug = tenant.slug;
		try {
			const resp = await fetch('/api/operator/scope', {
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-csrf-token': getCsrfToken() },
				body: JSON.stringify({ slug: tenant.slug })
			});
			if (!resp.ok) {
				toast('danger', 'Could not open tenant');
				return;
			}
			qc.clear();
			await invalidateAll();
			goto('/operator/scope/profile');
		} finally {
			openingScopeSlug = null;
		}
	}
</script>

{#snippet nameCell(tenant: TenantDto)}
	<div class="cluster cluster-tight">
		{#if tenant.slug === 'platform'}
			<Icon icon={Shield} size="sm" class="text-primary" />
		{/if}
		<span class="text-fg font-medium">{tenant.display_name}</span>
		{#if tenant.slug === 'platform'}
			<Badge variant="brand" style="soft" size="sm">Platform</Badge>
		{/if}
	</div>
{/snippet}

{#snippet statusCell(tenant: TenantDto)}
	{@const badge = tenantLifecycleBadge(tenant)}
	<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
{/snippet}

{#snippet rowActions(tenant: TenantDto)}
	{#if openingScopeSlug === tenant.slug}
		<div class="cluster cluster-tight" aria-label="Opening {tenant.display_name}">
			<Spinner size={14} />
			<span class="caption text-fg-muted">Opening…</span>
		</div>
	{:else if canView && tenant.slug !== 'platform'}
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

	<div class="cluster">
		<div class="relative flex-1">
			<span class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
				<Icon icon={Search} size="sm" class="text-fg-subtle" />
			</span>
			<input
				type="search"
				placeholder="Filter by name, slug, or legal name"
				value={search}
				oninput={(e) => setSearch((e.currentTarget as HTMLInputElement).value)}
				class="glass-input w-full rounded-md py-2 pr-3 pl-9 text-sm"
				aria-label="Filter tenants"
			/>
		</div>
	</div>

	<DataTable.Root
		{columns}
		rows={paged}
		rowKey={(t) => t.id}
		state={tableState}
		error={query.error?.message}
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
						{err?.message ?? 'Unknown error'}
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

	{#if totalPages > 1}
		<nav class="cluster cluster-spread" aria-label="Tenant list pagination">
			<p class="caption text-fg-muted">
				{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
			</p>
			<div class="cluster cluster-tight">
				<Button
					variant="ghost"
					size="sm"
					disabled={page <= 1}
					onclick={() => setPage(page - 1)}
					aria-label="Previous page"
				>
					← Prev
				</Button>
				<span class="caption">Page {page} / {totalPages}</span>
				<Button
					variant="ghost"
					size="sm"
					disabled={page >= totalPages}
					onclick={() => setPage(page + 1)}
					aria-label="Next page"
				>
					Next →
				</Button>
			</div>
		</nav>
	{/if}
</div>

<CreateTenantDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<ImpersonateModal
	bind:open={impersonateOpen}
	tenant={impersonateTarget}
	onOpenChange={(o) => (impersonateOpen = o)}
/>
