<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { Badge, Breadcrumbs, Button, type BreadcrumbItem } from '$ui';
	import { Building2, Icon, Shield, LogOut } from '$icons';
	import { exitScopeMutation } from '$features/operator/scope';
	import { session } from '$features/auth';
	import { isNavActive, visibleNav } from '#lib/config/nav.ts';
	import { NAV_ICONS } from '#lib/config/nav-icons.ts';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	const tenant = $derived(data.tenant);
	const breadcrumbs = $derived<BreadcrumbItem[]>([
		{ href: '/operator/tenants', label: 'Tenants' },
		{ label: tenant.display_name }
	]);

	// The tabs are the nav config's "Tenant context" section, filtered by the operator's own
	// platform.* permissions — the same entries the sidebar lists in tenant context.
	const tabs = $derived(
		visibleNav(session.capabilities, true).find((s) => s.id === 'tenantContext')?.items ?? []
	);

	// The one exit flow: cookie, cache, layout reload, navigate (shared with the session guard's BFF half).
	const exit = exitScopeMutation();
</script>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />

	<header class="cluster cluster-spread">
		<div class="cluster cluster-tight">
			{#if tenant.slug === 'platform'}
				<Icon icon={Shield} size="sm" class="text-primary" />
			{:else}
				<Icon icon={Building2} size="sm" class="text-muted-foreground" />
			{/if}
			<h1 class="h2">{tenant.display_name}</h1>
			{#if tenant.slug === 'platform'}
				<Badge variant="brand" size="sm">Platform</Badge>
			{/if}
		</div>
		<Button variant="ghost" size="sm" onclick={() => exit.mutate()} loading={exit.isPending}>
			<Icon icon={LogOut} size="sm" /> Exit context
		</Button>
	</header>

	<nav aria-label="Tenant sections">
		<ul class="cluster cluster-tight" style="list-style:none;margin:0;padding:0;">
			{#each tabs as tab (tab.href)}
				{@const active = isNavActive(page.url.pathname, tab.href)}
				{@const TabIcon = NAV_ICONS[tab.key]}
				<li>
					<a
						href={tab.href}
						aria-current={active ? 'page' : undefined}
						class={['lk-tenant-tab', active && 'lk-tenant-tab--active']}
					>
						<TabIcon size={14} aria-hidden="true" />
						{tab.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

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
		color: var(--muted-foreground);
		transition:
			background 0.15s,
			color 0.15s;
	}
	.lk-tenant-tab--active {
		background: var(--card);
		color: var(--foreground);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-tenant-tab:not(.lk-tenant-tab--active):hover {
			background: var(--muted);
			color: var(--foreground);
		}
	}
</style>
