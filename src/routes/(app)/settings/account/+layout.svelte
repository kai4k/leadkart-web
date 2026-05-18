<script lang="ts">
	import { page } from '$app/state';
	import { Alert, Spinner } from '$ui';
	import { profile } from '$features/auth/stores/profile.svelte';
	import { sessions } from '$features/auth/stores/sessions.svelte';
	import { displayName } from '$features/auth/view-models';
	import { cn } from '$lib/utils/cn';

	/**
	 * Account Settings layout — owns the shared chrome (header + sub-
	 * route nav) for /settings/account/* sub-pages. Mirrors the
	 * /settings/tenant/* pattern.
	 *
	 * Load lifecycle: profile.load() + sessions.load() are called
	 * once on this layout's first $effect run (idle-guarded). Layout
	 * persists across tab navigation, so subsequent clicks reuse the
	 * loaded snapshot.
	 */

	let { children } = $props();

	$effect(() => {
		if (profile.status === 'idle') {
			profile.load().catch(() => {
				// Store transitions to 'error'; UI handles below.
			});
		}
		if (sessions.status === 'idle') {
			sessions.load().catch(() => {});
		}
	});

	const tabs: ReadonlyArray<{ href: string; label: string }> = [
		{ href: '/settings/account/profile', label: 'Profile' },
		{ href: '/settings/account/security', label: 'Security' },
		{ href: '/settings/account/sessions', label: 'Sessions' }
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return path === href || path.startsWith(href + '/');
	}
</script>

<svelte:head>
	<title>Account · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		{#if profile.current}
			<h1 class="h1">{displayName(profile.current)}</h1>
			<p class="body-sm text-[var(--color-fg-muted)]">
				{profile.current.email}
			</p>
		{:else}
			<h1 class="h1">Account</h1>
		{/if}
	</header>

	<nav aria-label="Account settings sections" class="border-b border-[var(--color-border)]">
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

	{#if profile.status === 'idle' || profile.status === 'loading'}
		<div class="flex justify-center py-16">
			<Spinner size={32} />
		</div>
	{:else if profile.status === 'error'}
		<Alert variant="danger" title="Could not load account settings">
			Refresh the page or try again in a moment. If the problem persists, contact support.
		</Alert>
	{:else if profile.current}
		{@render children()}
	{/if}
</div>
