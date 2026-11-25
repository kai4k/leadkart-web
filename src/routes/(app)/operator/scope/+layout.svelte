<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import SectionNav from '#lib/layouts/SectionNav.svelte';
	import NestedPageHeaders from '#lib/layouts/NestedPageHeaders.svelte';
	import type { Snippet } from 'svelte';
	import { Badge } from '#lib/components/ui/index.ts';
	import { session } from '#lib/features/auth/index.ts';
	import { isPlatformTenant } from '#lib/features/tenant/index.ts';
	import { visibleNav } from '#lib/config/nav.ts';
	import { NAV_ICONS } from '#lib/config/nav-icons.ts';
	import type { LayoutData } from './$types';

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	const tenant = $derived(data.tenant);
	const crumbs = $derived([
		{ href: '/operator/tenants', label: $_('nav.items.tenants') },
		{ label: tenant.display_name, isolate: true }
	]);

	// The tabs are the nav config's "Tenant context" section, filtered by the operator's own
	// platform.* permissions — the same entries the sidebar lists in tenant context.
	const tabs = $derived(
		(visibleNav(session.capabilities, true).find((s) => s.id === 'tenantContext')?.items ?? []).map(
			(t) => ({ href: t.href, label: $_(`nav.items.${t.key}`), icon: NAV_ICONS[t.key] })
		)
	);
</script>

<div class="stack stack-relaxed">
	<PageHeader title={tenant.display_name} isolated {crumbs}>
		{#snippet meta()}
			{#if isPlatformTenant(tenant)}
				<Badge variant="brand" size="sm">{$_('shell.tenantContext.platform')}</Badge>
			{/if}
		{/snippet}
	</PageHeader>

	<SectionNav {tabs} label={$_('pages.scope.sections')} />

	<NestedPageHeaders>
		{@render children()}
	</NestedPageHeaders>
</div>
