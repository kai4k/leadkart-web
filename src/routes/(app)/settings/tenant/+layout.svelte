<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import NestedPageHeaders from '#lib/layouts/NestedPageHeaders.svelte';
	import SectionNav from '#lib/layouts/SectionNav.svelte';
	import { page } from '$app/state';
	import { Badge } from '#lib/components/ui/index.ts';
	import { tenantDisplayName, tenantStatus } from '#lib/features/tenant/view-models.ts';
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
	const badge = $derived(tenantStatus(tenantData.status));

	const tabs = $derived([
		{ href: '/settings/tenant/profile', label: $_('pages.tenant.tabs.profile') },
		{ href: '/settings/tenant/statutory', label: $_('pages.tenant.tabs.statutory') },
		{ href: '/settings/tenant/contact', label: $_('pages.tenant.tabs.contact') },
		{ href: '/settings/tenant/security', label: $_('pages.tenant.tabs.security') },
		{ href: '/settings/tenant/preferences', label: $_('pages.tenant.tabs.preferences') }
	]);

	const activeTab = $derived(tabs.find((t) => page.url.pathname.startsWith(t.href)));
	const crumbs = $derived([
		{ label: $_('pages.crumbs.settings') },
		{ label: $_('nav.items.tenantSettings') },
		...(activeTab ? [{ label: activeTab.label }] : [])
	]);
</script>

<svelte:head>
	<title>Tenant Settings · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<PageHeader
		title={tenantDisplayName(tenantData)}
		description={$_('pages.tenant.description')}
		{crumbs}
	>
		{#snippet meta()}
			<Badge variant={badge.variant}>{badge.label}</Badge>
		{/snippet}
	</PageHeader>
	<SectionNav {tabs} label={$_('pages.tenant.sections')} />

	<NestedPageHeaders>
		{@render children()}
	</NestedPageHeaders>
</div>
