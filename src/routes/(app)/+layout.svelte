<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { onMount } from 'svelte';
	import AppShell from '$layouts/AppShell.svelte';
	import NavProgressBar from '$layouts/NavProgressBar.svelte';
	import PwaStatusBar from '$layouts/PwaStatusBar.svelte';
	import { ImpersonationBanner } from '$features/operator/impersonation';
	import { renderQueryClient } from '#lib/api/query-client.ts';
	import { Toaster } from '$ui';
	import { refreshCapabilities } from '#lib/api/capabilities-refresh.ts';
	import { listenForScopeChanges } from '#lib/api/operator-scope.ts';
	import { useRefreshOnFocus } from '#lib/hooks/index.ts';

	let { children, data } = $props();

	// Browser: the tab's one client. Server: a fresh client for this request only.
	const client = renderQueryClient();

	// A permission changed elsewhere shows up when the user comes back to this tab.
	useRefreshOnFocus(refreshCapabilities);

	// Another tab entered or left a tenant context: follow it now (its next call would be refused anyway).
	onMount(() => listenForScopeChanges(client));
</script>

<QueryClientProvider {client}>
	<!-- The context fingerprint this page shows (opaque; the API client sends it with every call).
		Present in the DOM so end-to-end tests can speak to the proxy the way the page does. -->
	<div hidden data-scope-context={data.scopeContext}></div>
	<NavProgressBar />
	<ImpersonationBanner />
	<PwaStatusBar />
	<AppShell>
		{@render children()}
	</AppShell>
	<Toaster />
</QueryClientProvider>
