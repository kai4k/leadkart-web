<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { onMount } from 'svelte';
	import AppShell from '$layouts/AppShell.svelte';
	import NavProgressBar from '$layouts/NavProgressBar.svelte';
	import PwaStatusBar from '$layouts/PwaStatusBar.svelte';
	import ReloadNotice from '$layouts/ReloadNotice.svelte';
	import { page } from '$app/state';
	import { ImpersonationBanner } from '$features/operator/impersonation';
	import { renderQueryClient } from '#lib/api/query-client.ts';
	import { refreshCapabilities } from '#lib/api/capabilities-refresh.ts';
	import { createCommittedContext, listenForScopeChanges } from '#lib/api/operator-scope.ts';
	import { useRefreshOnFocus } from '#lib/hooks/index.ts';

	let { children } = $props();

	// Browser: the tab's one client. Server: a fresh client for this request only.
	const client = renderQueryClient();

	// A permission changed elsewhere shows up when the user comes back to this tab.
	useRefreshOnFocus(refreshCapabilities);

	// Another tab entered or left a tenant context: follow it now (its next call would be refused anyway).
	onMount(() => listenForScopeChanges(client));

	// THE check that makes "a page never keeps its state when its context moves" structural. Every
	// layout run commits a fingerprint; one that differs from the last committed while this tab is not
	// itself entering or leaving a context means the cookie moved without anyone announcing it (the
	// layout clearing it on lost permission, a sign-in elsewhere) and no refusal would ever arrive,
	// because the fingerprint now matches. `$effect.pre` runs before this component's DOM updates and
	// before its children's effects see the new data, and the children are removed (`contextMoved`)
	// until the reset replaces the document: a form still open cannot submit under the new
	// fingerprint in the meantime.
	const committedContext = createCommittedContext(client);
	let contextMoved = $state(false);
	$effect.pre(() => {
		const fingerprint = (page.data as { scopeContext?: string }).scopeContext;
		if (committedContext.observe(fingerprint)) contextMoved = true;
	});
</script>

<QueryClientProvider {client}>
	<NavProgressBar />
	<ImpersonationBanner />
	<PwaStatusBar />
	<ReloadNotice />
	<AppShell>
		{#if !contextMoved}
			{@render children()}
		{/if}
	</AppShell>
</QueryClientProvider>
