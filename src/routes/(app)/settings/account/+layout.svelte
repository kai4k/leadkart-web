<script lang="ts">
	import { page } from '$app/state';
	import type { ResolvedPathname } from '$app/types';
	import { Breadcrumbs, Skeleton, type BreadcrumbItem } from '$ui';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { myProfileQuery } from '$features/auth/queries';
	import { session } from '$features/auth';
	import { displayName } from '$features/auth/view-models';
	import { cn } from '#lib/utils/cn.ts';

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

	const tabs: ReadonlyArray<{ href: ResolvedPathname; label: string }> = [
		{ href: '/settings/account/profile', label: 'Profile' },
		{ href: '/settings/account/security', label: 'Security' },
		{ href: '/settings/account/sessions', label: 'Sessions' }
	];

	const activeTab = $derived(tabs.find((t) => isActive(t.href)));
	const breadcrumbs = $derived<BreadcrumbItem[]>([
		{ label: 'Settings' },
		{ href: '/settings/account', label: 'Account' },
		...(activeTab ? [{ label: activeTab.label }] : [])
	]);

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return path === href || path.startsWith(`${href}/`);
	}
</script>

<svelte:head>
	<title>Account · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />
	<header class="stack stack-tight">
		{#if profileData}
			<h1 class="h1">{displayName(profileData)}</h1>
			<p class="body-sm text-muted-foreground">
				{profileData.email}
			</p>
		{:else}
			<h1 class="h1">Account</h1>
		{/if}
	</header>

	<nav aria-label="Account settings sections" class="border-border border-b">
		<ul class="cluster gap-0">
			{#each tabs as tab (tab.href)}
				{@const active = isActive(tab.href)}
				<li>
					<a
						href={tab.href}
						aria-current={active ? 'page' : undefined}
						class={cn(
							'label -mb-px inline-block border-b-2 px-4 py-2 transition-colors',
							'focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
							'focus-visible:ring-ring',
							active
								? 'border-primary text-primary'
								: 'text-muted-foreground hover:text-foreground border-transparent'
						)}
					>
						{tab.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<QueryState query={profileQuery} noun="account settings">
		{#snippet skeleton()}
			<Skeleton class="h-6 w-1/2" />
			<Skeleton class="h-4 w-1/3" />
			<Skeleton class="h-32 w-full rounded-md" />
		{/snippet}
		{@render children()}
	</QueryState>
</div>
