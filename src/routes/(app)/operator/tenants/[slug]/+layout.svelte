<script lang="ts">
	import { page } from '$app/state';
	import { operatorTenants } from '$features/operator/tenants/stores/operator-tenants.svelte';
	import { Badge, Spinner } from '$ui';
	import { Building2, Icon, Users, Shield } from '$icons';

	let { children } = $props();

	const tenant = $derived(operatorTenants.current);
	const slug = $derived(page.params.slug);

	/** Sub-nav tabs for the tenant-context surface. */
	const tabs = $derived([
		{ href: `/operator/tenants/${slug}/profile`, label: 'Profile', icon: Building2 },
		{ href: `/operator/tenants/${slug}/members`, label: 'Members', icon: Users }
	]);

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<div class="stack stack-relaxed">
	<!-- Tenant context header -->
	{#if operatorTenants.status === 'loading' && !tenant}
		<div class="flex justify-center py-8"><Spinner size={28} /></div>
	{:else if tenant}
		<header class="stack stack-tight">
			<a
				href="/operator/tenants"
				class="caption text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">← All tenants</a
			>
			<div class="cluster cluster-tight">
				{#if tenant.slug === 'platform'}
					<Icon icon={Shield} size="sm" class="text-[var(--color-primary)]" />
				{:else}
					<Icon icon={Building2} size="sm" class="text-[var(--color-fg-muted)]" />
				{/if}
				<h1 class="h2">{tenant.display_name}</h1>
				{#if tenant.slug === 'platform'}
					<Badge variant="brand" style="soft" size="sm">Platform</Badge>
				{/if}
			</div>
			<p class="caption text-[var(--color-fg-muted)]">{tenant.slug} · {tenant.legal_name}</p>
		</header>

		<!-- In-tenant sub-nav -->
		<nav aria-label="Tenant sections">
			<ul class="cluster cluster-tight" style="list-style:none;margin:0;padding:0;">
				{#each tabs as tab (tab.href)}
					{@const active = isActive(tab.href)}
					<li>
						<a
							href={tab.href}
							aria-current={active ? 'page' : undefined}
							class={['lk-tenant-tab', active && 'lk-tenant-tab--active']}
						>
							<tab.icon size={14} aria-hidden="true" />
							{tab.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}

	{@render children()}
</div>

<style>
	.lk-tenant-tab {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
		transition:
			background 0.15s,
			color 0.15s;
	}
	.lk-tenant-tab--active {
		background: var(--color-bg-elevated);
		color: var(--color-fg);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-tenant-tab:not(.lk-tenant-tab--active):hover {
			background: var(--color-bg-muted);
			color: var(--color-fg);
		}
	}
</style>
