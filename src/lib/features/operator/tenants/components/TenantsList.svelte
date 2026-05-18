<script lang="ts">
	import { Alert, Badge, Button, Card, EmptyState, Spinner } from '$ui';
	import { Building2, Eye, Plus, Search, Shield, Icon } from '$icons';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import { hasPermission } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';
	import CreateTenantDrawer from './CreateTenantDrawer.svelte';
	import ImpersonateModal from '$features/operator/impersonation/components/ImpersonateModal.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	const PAGE_SIZE = 10;

	let createOpen = $state(false);
	let impersonateOpen = $state(false);
	let impersonateTarget = $state<TenantDto | null>(null);
	let page = $state(1);

	const canCreate = $derived(hasPermission(session.principal, 'platform.tenants.create'));
	const canView = $derived(hasPermission(session.principal, 'platform.tenants.view'));

	/**
	 * Pin the platform tenant (slug === 'platform') to the top of the
	 * list regardless of search/filter order. Stripe Connect / Auth0
	 * tenant-list pattern: the operator's own platform is always the
	 * first visible entry and carries a distinct visual treatment.
	 */
	const filtered = $derived.by(() => {
		const all = operatorTenants.filtered;
		const platform = all.find((t) => t.slug === 'platform');
		const rest = all.filter((t) => t.slug !== 'platform');
		return platform ? [platform, ...rest] : rest;
	});
	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
	const paged = $derived(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

	// Reset to page 1 whenever the filter changes.
	$effect(() => {
		void operatorTenants.search;
		page = 1;
	});

	// Load on mount when still idle.
	$effect(() => {
		if (operatorTenants.status === 'idle') {
			operatorTenants.load();
		}
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
				bind:value={operatorTenants.search}
				class="glass-input w-full rounded-md py-2 pr-3 pl-9 text-sm"
				aria-label="Filter tenants"
			/>
		</div>
	</div>

	{#if operatorTenants.status === 'loading'}
		<div class="flex items-center justify-center py-12">
			<Spinner size={32} />
		</div>
	{:else if operatorTenants.status === 'error' && operatorTenants.error}
		<Alert variant="danger" title="Failed to load tenants">
			{operatorTenants.error}
			<Button variant="ghost" size="sm" onclick={() => operatorTenants.load()} class="mt-2"
				>Retry</Button
			>
		</Alert>
	{:else if operatorTenants.list.length === 0 && operatorTenants.status === 'ready'}
		<EmptyState
			icon={Building2}
			title="No tenants yet"
			description="Register the first one using the button above."
		/>
	{:else if filtered.length === 0}
		<EmptyState
			icon={Building2}
			title="No matches for '{operatorTenants.search}'"
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
										<Icon
											icon={Shield}
											size="sm"
											class="text-[var(--color-primary)]"
											aria-hidden="true"
										/>
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
