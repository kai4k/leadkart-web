<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { tenantBySlugQuery } from '$features/operator/tenants/queries';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';
	import { Badge, Breadcrumbs, Spinner, Alert } from '$ui';
	import type { BreadcrumbItem } from '$ui';
	import { Building2, Icon, Users, Shield, Settings, Activity, UserCog } from '$icons';

	let { children, data } = $props();

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'platform.tenants.view')) {
			goto('/dashboard', { replaceState: true });
		}
	});

	const slug = $derived(data.slug);
	const query = $derived(tenantBySlugQuery(slug));
	const tenant = $derived(query.data ?? null);

	/** Sub-nav tabs for the tenant-context surface (all 5 per spec §B.2.2). */
	const tabs = $derived([
		{ href: `/operator/tenants/${slug}/profile`, label: 'Profile', icon: Building2 },
		{ href: `/operator/tenants/${slug}/members`, label: 'Members', icon: Users },
		{ href: `/operator/tenants/${slug}/roles`, label: 'Roles', icon: UserCog },
		{ href: `/operator/tenants/${slug}/activity`, label: 'Activity', icon: Activity },
		{ href: `/operator/tenants/${slug}/settings`, label: 'Settings', icon: Settings }
	]);

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<div class="stack stack-relaxed">
	<!-- Tenant context header -->
	{#if query.isPending}
		<div class="flex justify-center py-8"><Spinner size={28} /></div>
	{:else if query.isError}
		<Alert variant="warning" title="Tenant not found">
			No tenant with that ID or slug, or you don't have access.
		</Alert>
	{:else if tenant === null}
		<!-- by-slug endpoint not yet available — graceful fallback.
		     Restore to normal branch once backend ships GET /v1/tenants/by-slug/{slug}
		     (ADR 0038 A.3). UUID-keyed navigation (/operator/tenants/<uuid>) works now. -->
		<Alert variant="info" title="Slug lookup pending">
			Tenant lookup by slug requires backend endpoint
			<code>GET /v1/tenants/by-slug/{slug}</code>
			which is not yet available. Operators can navigate via UUID at
			<code>/operator/tenants/&lt;tenant-uuid&gt;</code> for now.
		</Alert>
	{:else if tenant}
		{@const breadcrumbs: BreadcrumbItem[] = [
			{ href: '/operator', label: 'Operator' },
			{ href: '/operator/tenants', label: 'Tenants' },
			{ label: tenant.display_name }
		]}
		<Breadcrumbs items={breadcrumbs} />
		<header class="stack stack-tight">
			<div class="cluster cluster-tight">
				{#if tenant.slug === 'platform'}
					<Icon icon={Shield} size="sm" class="text-primary" />
				{:else}
					<Icon icon={Building2} size="sm" class="text-fg-muted" />
				{/if}
				<h1 class="h2">{tenant.display_name}</h1>
				{#if tenant.slug === 'platform'}
					<Badge variant="brand" style="soft" size="sm">Platform</Badge>
				{/if}
			</div>
			<p class="caption text-fg-muted">{tenant.slug} · {tenant.legal_name}</p>
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

		{@render children()}
	{/if}
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
