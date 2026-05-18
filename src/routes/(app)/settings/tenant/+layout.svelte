<script lang="ts">
	import { page } from '$app/state';
	import { Alert, Spinner } from '$ui';
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

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return path === href || path.startsWith(href + '/');
	}
</script>

<svelte:head>
	<title>Tenant Settings · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		{#if tenantData && badge}
			<div class="cluster">
				<h1 class="h1">{tenantDisplayName(tenantData)}</h1>
				<span
					class={cn(
						'label-small inline-flex items-center rounded-full px-2 py-0.5',
						badge.variant === 'success' &&
							'bg-[var(--color-success-50)] text-[var(--color-success-900)]',
						badge.variant === 'warning' &&
							'bg-[var(--color-warning-50)] text-[var(--color-warning-900)]',
						badge.variant === 'danger' &&
							'bg-[var(--color-danger-50)] text-[var(--color-danger-900)]',
						badge.variant === 'info' && 'bg-[var(--color-info-50)] text-[var(--color-info-900)]'
					)}
				>
					{badge.label}
				</span>
			</div>
		{:else}
			<h1 class="h1">Tenant Settings</h1>
		{/if}
		<p class="body-sm text-[var(--color-fg-muted)]">
			Manage your organisation's profile, statutory IDs, contact details, and platform preferences.
		</p>
	</header>

	<nav aria-label="Tenant settings sections" class="border-b border-[var(--color-border)]">
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
							'focus-visible:ring-[var(--color-focus-ring)]',
							active
								? 'border-[var(--color-primary)] text-[var(--color-primary)]'
								: 'border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
						)}
					>
						{tab.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	{#if tenantQuery.isPending}
		<div class="flex justify-center py-16">
			<Spinner size={32} />
		</div>
	{:else if tenantQuery.isError}
		<Alert variant="danger" title="Could not load tenant settings">
			Refresh the page or try again in a moment. If the problem persists, contact support.
		</Alert>
	{:else if tenantData}
		{@render children()}
	{/if}
</div>
