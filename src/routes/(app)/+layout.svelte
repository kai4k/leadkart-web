<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { onMount } from 'svelte';
	import AppShell from '#lib/layouts/AppShell.svelte';
	import NavProgressBar from '#lib/layouts/NavProgressBar.svelte';
	import PwaStatusBar from '#lib/layouts/PwaStatusBar.svelte';
	import ReloadNotice from '#lib/layouts/ReloadNotice.svelte';
	import { page } from '$app/state';
	import { ImpersonationBanner } from '#lib/features/operator/impersonation/index.ts';
	import { renderQueryClient } from '#lib/api/query-client.ts';
	import { refreshCapabilities } from '#lib/api/capabilities-refresh.ts';
	import { createCommittedContext, listenForScopeChanges } from '#lib/api/operator-scope.ts';
	import { resetBlock } from '#lib/api/reset-block.svelte.ts';
	import { useRefreshOnFocus } from '#lib/hooks/index.ts';

	let { children } = $props();

	// Browser: the tab's one client. Server: a fresh client for this request only.
	const client = renderQueryClient();

	// A permission changed elsewhere shows up when the user comes back to this tab.
	useRefreshOnFocus(refreshCapabilities);

	// Another tab entered or left a tenant context: follow it now (its next call would be refused anyway).
	onMount(() => listenForScopeChanges(client));

	// A page restored from the back/forward cache is frozen from before: the cookie may have moved
	// while it sat there, and nothing announced it to a frozen document. Re-run the layout; its
	// commit goes through the committed-context check below like any other.
	onMount(() => {
		const recheck = (event: PageTransitionEvent) => {
			if (event.persisted) void refreshCapabilities();
		};
		window.addEventListener('pageshow', recheck);
		return () => window.removeEventListener('pageshow', recheck);
	});

	// THE check that makes "a page never keeps its state when its context moves" structural. Every
	// layout run commits a fingerprint; one that differs from the last committed while this tab is not
	// itself entering or leaving a context means the cookie moved without anyone announcing it (the
	// layout clearing it on lost permission, a sign-in elsewhere) and no refusal would ever arrive,
	// because the fingerprint now matches. `$effect.pre` runs before this component's DOM updates and
	// before its children's effects see the new data, and the children are removed (`contextMoved`)
	// until the reset replaces the document: a form still open cannot submit under the new
	// fingerprint in the meantime. The same goes for a reset that was declined (offline, or a loop
	// stop): its banner is up, the page is stale, and nothing on it may stay interactive.
	const committedContext = createCommittedContext(client);
	let contextMoved = $state(false);
	$effect.pre(() => {
		const fingerprint = (page.data as { scopeContext?: string }).scopeContext;
		const declined = resetBlock.kind !== null;
		if (committedContext.observe(fingerprint) || declined) contextMoved = true;
	});
</script>

<QueryClientProvider {client}>
	<NavProgressBar />
	<PwaStatusBar />
	<ReloadNotice />
	<AppShell>
		{#snippet banner()}
			<ImpersonationBanner />
		{/snippet}
		{#if !contextMoved}
			{@render children()}
		{/if}
	</AppShell>
</QueryClientProvider>
