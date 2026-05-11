<script lang="ts">
	import { page } from '$app/state';
	import { Alert, Spinner } from '$ui';
	import { tenant } from '$features/tenant/stores/tenant.svelte';
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
	 * Load lifecycle: tenant.load() is called once on the layout's
	 * first $effect run (idle-guarded). Layout persists across tab
	 * navigation, so subsequent tab clicks reuse the loaded snapshot.
	 */

	let { children } = $props();

	$effect(() => {
		if (tenant.status === 'idle') {
			tenant.load().catch(() => {
				// Store transitions to 'error'; UI handles below.
			});
		}
	});

	const badge = $derived(tenant.current ? tenantStatusBadge(tenant.current.status) : null);

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
		{#if tenant.current && badge}
			<div class="cluster">
				<h1 class="h1">{tenantDisplayName(tenant.current)}</h1>
				<span
					class={cn(
						'caption inline-flex items-center rounded-full px-2 py-0.5 font-medium',
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
							'body-sm -mb-px inline-block border-b-2 px-4 py-2 font-medium transition-colors',
							'focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
							'focus-visible:ring-[var(--color-brand-500)]',
							active
								? 'border-[var(--color-brand-600)] text-[var(--color-brand-700)]'
								: 'border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
						)}
					>
						{tab.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	{#if tenant.status === 'idle' || tenant.status === 'loading'}
		<div class="flex justify-center py-16">
			<Spinner size={32} />
		</div>
	{:else if tenant.status === 'error'}
		<Alert variant="danger" title="Could not load tenant settings">
			Refresh the page or try again in a moment. If the problem persists, contact support.
		</Alert>
	{:else if tenant.current}
		{@render children()}
	{/if}
</div>
