<script lang="ts">
	import { Alert, Badge, Button, Card, EmptyState, Spinner } from '$ui';
	import { Building2, Eye, Plus, Search, Shield, Icon } from '$icons';
	import { tenantsListQuery } from '$features/operator/tenants/queries';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import { hasPermission } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';
	import { NetworkError } from '$lib/api/errors';
	import CreateTenantDrawer from './CreateTenantDrawer.svelte';
	import ImpersonateModal from '$features/operator/impersonation/components/ImpersonateModal.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	const PAGE_SIZE = 10;

	let createOpen = $state(false);
	let impersonateOpen = $state(false);
	let impersonateTarget = $state<TenantDto | null>(null);
	let page = $state(1);
	let search = $state('');

	const canCreate = $derived(hasPermission(session.principal, 'platform.tenants.create'));
	const canView = $derived(hasPermission(session.principal, 'platform.tenants.view'));

	// TanStack Query v6 (Svelte 5): result is Svelte 5 reactive state, accessed directly.
	const query = tenantsListQuery();

	/**
	 * Client-side search + platform-pin.
	 * Platform tenant (slug === 'platform') is always first — Stripe
	 * Connect / Auth0 tenant-list pattern.
	 */
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

	// Reset to page 1 when search changes.
	$effect(() => {
		void search;
		page = 1;
	});

	function openImpersonate(tenant: TenantDto) {
		impersonateTarget = tenant;
		impersonateOpen = true;
	}
</script>

<div class="stack stack-relaxed">
	<header class="cluster cluster-spread">
		<div class="stack stack-tight">
			<h1 class="h1">Tenants</h1>
			<p class="caption text-[var(--color-fg-muted)]">Operator-side tenant management.</p>
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
				<Icon icon={Search} size="sm" class="text-[var(--color-fg-subtle)]" />
			</span>
			<input
				type="search"
				placeholder="Filter by name, slug, or legal name"
				bind:value={search}
				class="glass-input w-full rounded-md py-2 pr-3 pl-9 text-sm"
				aria-label="Filter tenants"
			/>
		</div>
	</div>

	{#if query.isPending}
		<div class="flex items-center justify-center py-12">
			<Spinner size={32} />
		</div>
	{:else if query.isError}
		{@const err = query.error}
		{#if err instanceof NetworkError}
			<Alert variant="warning" title="Connection problem">
				We couldn't reach the server. Check your network.
				<Button variant="ghost" size="sm" onclick={() => query.refetch()} class="mt-2">Retry</Button
				>
			</Alert>
		{:else}
			<Alert variant="danger" title="Failed to load tenants">
				{err.message}
				<Button variant="ghost" size="sm" onclick={() => query.refetch()} class="mt-2">Retry</Button
				>
			</Alert>
		{/if}
	{:else if (query.data?.tenants ?? []).length === 0}
		<EmptyState
			icon={Building2}
			title="No tenants yet"
			description="Register the first one using the button above."
		/>
	{:else if filtered.length === 0}
		<EmptyState
			icon={Building2}
			title="No matches for '{search}'"
			description="Try a different name or slug."
		/>
	{:else}
		<ul class="stack stack-tight" aria-label="Tenants">
			{#each paged as t (t.id)}
				{@const badge = tenantLifecycleBadge(t)}
				{@const isPlatform = t.slug === 'platform'}
				<li>
					<Card.Root>
						<Card.Content class="grid grid-cols-[1fr_auto] items-center gap-4">
							<div class="stack stack-tight">
								<div class="cluster cluster-tight">
									{#if isPlatform}
										<Icon icon={Shield} size="sm" class="text-[var(--color-primary)]" />
									{/if}
									<a
										href="/operator/tenants/{t.id}"
										class="h5 text-[var(--color-fg)] hover:underline">{t.display_name}</a
									>
									{#if isPlatform}
										<Badge variant="brand" style="soft" size="sm">Platform</Badge>
									{/if}
									<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
								</div>
								<p class="caption text-[var(--color-fg-muted)]">
									{t.slug} · {t.legal_name}
								</p>
							</div>
							<div class="cluster cluster-tight">
								{#if canView && !isPlatform}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => openImpersonate(t)}
										aria-label="Impersonate {t.display_name}"
									>
										<Icon icon={Eye} size="sm" /> Impersonate
									</Button>
								{/if}
								<a
									href="/operator/tenants/{t.id}"
									class="label text-[var(--color-primary)] hover:underline">Open →</a
								>
							</div>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>

		{#if totalPages > 1}
			<nav class="cluster cluster-spread" aria-label="Tenant list pagination">
				<p class="caption text-[var(--color-fg-muted)]">
					{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
				</p>
				<div class="cluster cluster-tight">
					<Button
						variant="ghost"
						size="sm"
						disabled={page <= 1}
						onclick={() => (page -= 1)}
						aria-label="Previous page"
					>
						← Prev
					</Button>
					<span class="caption">Page {page} / {totalPages}</span>
					<Button
						variant="ghost"
						size="sm"
						disabled={page >= totalPages}
						onclick={() => (page += 1)}
						aria-label="Next page"
					>
						Next →
					</Button>
				</div>
			</nav>
		{/if}
	{/if}
</div>

<CreateTenantDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<ImpersonateModal
	bind:open={impersonateOpen}
	tenant={impersonateTarget}
	onOpenChange={(o) => (impersonateOpen = o)}
/>
