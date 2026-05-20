<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { Badge, Breadcrumbs, Button } from '$ui';
	import type { BreadcrumbItem } from '$ui';
	import { Building2, Icon, Users, Shield, Settings, Activity, UserCog, LogOut } from '$icons';
	import { getCsrfToken } from '$lib/api/csrf';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	const tenant = $derived(data.tenant);
	const breadcrumbs = $derived<BreadcrumbItem[]>([
		{ href: '/operator/tenants', label: 'Tenants' },
		{ label: tenant.display_name }
	]);

	const tabs = [
		{ href: '/operator/scope/profile', label: 'Profile', icon: Building2 },
		{ href: '/operator/scope/members', label: 'Members', icon: Users },
		{ href: '/operator/scope/roles', label: 'Roles', icon: UserCog },
		{ href: '/operator/scope/activity', label: 'Activity', icon: Activity },
		{ href: '/operator/scope/settings', label: 'Settings', icon: Settings }
	];

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	const qc = useQueryClient();

	async function exitScope() {
		await fetch('/api/operator/scope', {
			method: 'DELETE',
			headers: { 'x-csrf-token': getCsrfToken() }
		});
		// Drop the entire TanStack cache — the previous scope's data is
		// no longer authoritative once the X-Tenant-Id header changes.
		qc.clear();
		// Re-run server loads so capabilities + nav refresh under the
		// non-scoped principal.
		await invalidateAll();
		goto('/operator/tenants', { replaceState: true });
	}
</script>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />

	<header class="cluster cluster-spread">
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
		<Button variant="ghost" size="sm" onclick={exitScope}>
			<Icon icon={LogOut} size="sm" /> Exit context
		</Button>
	</header>

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
