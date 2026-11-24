<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import NestedPageHeaders from '#lib/layouts/NestedPageHeaders.svelte';
	import SectionNav from '#lib/layouts/SectionNav.svelte';
	import { page } from '$app/state';
	import { Skeleton } from '#lib/components/ui/index.ts';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { myProfileQuery } from '#lib/features/auth/queries.ts';
	import { session } from '#lib/features/auth/index.ts';
	import { displayName } from '#lib/features/auth/view-models.ts';

	/**
	 * Account Settings layout — owns the shared chrome (header + sub-
	 * route nav) for /settings/account/* sub-pages. Mirrors the
	 * /settings/tenant/* pattern.
	 *
	 * TanStack Query handles fetch lifecycle — no manual load() call needed.
	 */

	let { children } = $props();

	const membershipId = $derived(session.principal?.membershipId ?? '');
	const profileQuery = myProfileQuery(() => membershipId);
	const profileData = $derived(profileQuery.data ?? null);

	const tabs = $derived([
		{ href: '/settings/account/profile', label: $_('pages.account.tabs.profile') },
		{ href: '/settings/account/security', label: $_('pages.account.tabs.security') },
		{ href: '/settings/account/sessions', label: $_('pages.account.tabs.sessions') }
	]);

	const activeTab = $derived(tabs.find((t) => page.url.pathname.startsWith(`${t.href}`)));
	const crumbs = $derived([
		{ label: $_('pages.crumbs.settings') },
		{ href: '/settings/account', label: $_('nav.items.account') },
		...(activeTab ? [{ label: activeTab.label }] : [])
	]);
</script>

<svelte:head>
	<title>Account · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<PageHeader
		title={profileData ? displayName(profileData) : $_('pages.account.title')}
		description={profileData?.email}
		{crumbs}
	/>
	<SectionNav {tabs} label={$_('pages.account.sections')} />

	<QueryState query={profileQuery} noun="account settings">
		{#snippet skeleton()}
			<Skeleton class="h-6 w-1/2" />
			<Skeleton class="h-4 w-1/3" />
			<Skeleton class="h-32 w-full rounded-md" />
		{/snippet}
		<NestedPageHeaders>
			{@render children()}
		</NestedPageHeaders>
	</QueryState>
</div>
