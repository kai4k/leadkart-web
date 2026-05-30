<script lang="ts">
	import { page } from '$app/state';
	import { Breadcrumbs } from '$ui';
	import type { BreadcrumbItem } from '$ui';
	import { tenantDisplayName, tenantStatusBadge } from '$features/tenant/view-models';
	import { cn } from '$lib/utils/cn';
	import type { LayoutData } from './$types';

	/**
	 * Tenant Settings layout — shared chrome (header + status pill +
	 * sub-route nav) for /settings/tenant/* sub-pages. Each sub-page
	 * (profile / statutory / contact / preferences / security)
	 * renders its own Card section into {@render children()}.
	 *
	 * Tenant data comes from +layout.server.ts (Svelte canon for
	 * form-shaped routes — load functions + form actions, no TanStack).
	 *
	 * Why a layout, not bits-ui Tabs: WAI-ARIA APG says "tabs linked
	 * to URLs use <nav>, not the tabs design pattern". Plus deep-link
	 * support + smaller per-route entry chunks.
	 */
	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const tenantData = $derived(data.tenant);
	const badge = $derived(tenantStatusBadge(tenantData.status));

	const tabs: ReadonlyArray<{ href: string; label: string }> = [
		{ href: '/settings/tenant/profile', label: 'Profile' },
		{ href: '/settings/tenant/statutory', label: 'Statutory IDs' },
		{ href: '/settings/tenant/contact', label: 'Contact' },
		{ href: '/settings/tenant/security', label: 'Security' },
		{ href: '/settings/tenant/preferences', label: 'Preferences' }
	];

	const activeTab = $derived(tabs.find((t) => isActive(t.href)));
	const breadcrumbs = $derived<BreadcrumbItem[]>([
		{ href: '/settings', label: 'Settings' },
		{ href: '/settings/tenant', label: 'Tenant' },
		...(activeTab ? [{ label: activeTab.label }] : [])
	]);

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return path === href || path.startsWith(`${href}/`);
	}
</script>

<svelte:head>
	<title>Tenant Settings · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />
	<header class="stack stack-tight">
		<div class="cluster">
			<h1 class="h1">{tenantDisplayName(tenantData)}</h1>
			<span
				class={cn(
					'label-small inline-flex items-center rounded-full px-2 py-0.5',
					badge.variant === 'success' && 'bg-success-50 text-success-900',
					badge.variant === 'warning' && 'bg-warning-50 text-warning-900',
					badge.variant === 'danger' && 'bg-danger-50 text-danger-900',
					badge.variant === 'info' && 'bg-info-50 text-info-900'
				)}
			>
				{badge.label}
			</span>
		</div>
		<p class="body-sm text-fg-muted">
			Manage your organisation's profile, statutory IDs, contact details, and platform preferences.
		</p>
	</header>

	<nav aria-label="Tenant settings sections" class="border-border border-b">
		<ul class="cluster gap-0">
			{#each tabs as tab (tab.href)}
				{@const active = isActive(tab.href)}
				<li>
					<a
						href={tab.href}
						aria-current={active ? 'page' : undefined}
						class={cn(
							'label -mb-px inline-block border-b-2 px-4 py-2 transition-colors',
							'focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
							'focus-visible:ring-focus-ring',
							active
								? 'border-primary text-primary'
								: 'text-fg-muted hover:text-fg border-transparent'
						)}
					>
						{tab.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	{@render children()}
</div>
