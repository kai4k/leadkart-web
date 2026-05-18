<script lang="ts">
	import { Alert, Badge, Button, Card, EmptyState } from '$ui';
	import { Building2, Eye, Plus, Search, Icon } from '$icons';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import { tenantLifecycleBadge } from '$features/operator/tenants/view-models';
	import { hasPermission } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';
	import CreateTenantDrawer from './CreateTenantDrawer.svelte';
	import ImpersonateModal from '$features/operator/impersonation/components/ImpersonateModal.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	let createOpen = $state(false);
	let impersonateOpen = $state(false);
	let impersonateTarget = $state<TenantDto | null>(null);
	let search = $state('');
	let pending = $state(false);

	const canCreate = $derived(hasPermission(session.principal, 'platform.tenants.create'));
	const canView = $derived(hasPermission(session.principal, 'platform.tenants.view'));

	function openImpersonate(tenant: TenantDto) {
		impersonateTarget = tenant;
		impersonateOpen = true;
	}

	async function onSearch(e: SubmitEvent) {
		e.preventDefault();
		pending = true;
		try {
			await operatorTenants.lookupById(search.trim());
		} finally {
			pending = false;
		}
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

	<Alert variant="info">
		Listing endpoint pending on the backend. For now, look up a tenant by ID or slug below.
	</Alert>

	<form class="cluster" onsubmit={onSearch}>
		<input
			type="search"
			placeholder="Tenant ID or slug"
			bind:value={search}
			class="glass-input flex-1 rounded-md px-3 py-2 text-sm"
		/>
		<Button type="submit" loading={pending || operatorTenants.status === 'loading'}>
			<Icon icon={Search} size="sm" /> Look up
		</Button>
	</form>

	{#if operatorTenants.status === 'error' && operatorTenants.error}
		<Alert variant="danger" title="Lookup failed">{operatorTenants.error}</Alert>
	{:else if operatorTenants.list.length === 0 && operatorTenants.status !== 'idle'}
		<EmptyState icon={Building2} title="No match" description="Try a different ID or slug." />
	{:else if operatorTenants.list.length > 0}
		<ul class="stack stack-tight" aria-label="Tenants">
			{#each operatorTenants.list as t (t.id)}
				{@const badge = tenantLifecycleBadge(t)}
				<li>
					<Card.Root>
						<Card.Content class="grid grid-cols-[1fr_auto] items-center gap-4">
							<div class="stack stack-tight">
								<div class="cluster cluster-tight">
									<a
										href="/operator/tenants/{t.id}"
										class="h5 text-[var(--color-fg)] hover:underline">{t.display_name}</a
									>
									<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
								</div>
								<p class="caption text-[var(--color-fg-muted)]">
									{t.slug} · {t.legal_name}
								</p>
							</div>
							<div class="cluster cluster-tight">
								{#if canView}
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
	{:else}
		<EmptyState
			icon={Building2}
			title="Search for a tenant"
			description="Paste a tenant ID or slug above to load its detail page."
		/>
	{/if}
</div>

<CreateTenantDrawer bind:open={createOpen} onOpenChange={(o) => (createOpen = o)} />
<ImpersonateModal
	bind:open={impersonateOpen}
	tenant={impersonateTarget}
	onOpenChange={(o) => (impersonateOpen = o)}
/>
