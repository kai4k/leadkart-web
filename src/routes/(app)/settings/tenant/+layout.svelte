<script lang="ts">
	import { page } from '$app/state';
	import { Alert, Breadcrumbs, Skeleton } from '$ui';
	import type { BreadcrumbItem } from '$ui';
	import { myCapabilitiesQuery } from '$features/auth/queries';
	import { tenantSelfQuery } from '$features/tenant/queries';
	import { tenantDisplayName, tenantStatusBadge } from '$features/tenant/view-models';
	import { cn } from '$lib/utils/cn';

	/**
	 * Tenant Settings layout — owns the shared chrome (header + status
	 * pill + sub-route nav) for /settings/tenant/* sub-pages. Each
	 * sub-page (profile / statutory / contact / preferences) renders
	 * only its own Card section into {@render children()}.
	 *
	 * Why a layout, not a single page with bits-ui Tabs:
	 *   - WAI-ARIA Authoring Practices: "If tabs are linked to URLs,
	 *     do not use the tabs design pattern" — use <nav> with
	 *     anchor links and aria-current="page".
	 *   - Stripe / Linear / GitHub / Vercel: deep-linkable settings
	 *     sub-routes, browser back/forward works, smaller per-route
	 *     entry chunks (Display Preferences ships Select primitive
	 *     ~3 KB; Statutory does not — only the visited route bundle
	 *     loads).
	 *
	 * TanStack Query handles fetch lifecycle — no manual load() call needed.
	 */

	let { children } = $props();

	const capsQuery = myCapabilitiesQuery();
	const tenantId = $derived(capsQuery.data?.tenant_id ?? '');
	const tenantQuery = $derived(tenantSelfQuery(tenantId));
	const tenantData = $derived(tenantQuery.data ?? null);
	const badge = $derived(tenantData ? tenantStatusBadge(tenantData.status) : null);

	const tabs: ReadonlyArray<{ href: string; label: string }> = [
		{ href: '/settings/tenant/profile', label: 'Profile' },
		{ href: '/settings/tenant/statutory', label: 'Statutory IDs' },
		{ href: '/settings/tenant/contact', label: 'Contact' },
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
		{#if tenantData && badge}
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
		{:else}
			<h1 class="h1">Tenant Settings</h1>
		{/if}
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

	{#if tenantQuery.isPending}
		<div class="stack stack-relaxed" aria-busy="true" aria-label="Loading tenant settings">
			<Skeleton class="h-6 w-1/3" />
			<Skeleton class="h-40 w-full rounded-md" />
		</div>
	{:else if tenantQuery.isError}
		<Alert variant="danger" title="Could not load tenant settings">
			Refresh the page or try again in a moment. If the problem persists, contact support.
		</Alert>
	{:else if tenantData}
		{@render children()}
	{/if}
</div>
