<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { ModeWatcher } from 'mode-watcher';
	import AppShell from '$layouts/AppShell.svelte';
	import NavProgressBar from '$layouts/NavProgressBar.svelte';
	import PwaStatusBar from '$layouts/PwaStatusBar.svelte';
	import { ImpersonationBanner } from '$features/operator/impersonation';
	import { queryClient } from '#lib/api/query-client.ts';
	import { Toaster } from '$ui';

	let { children } = $props();
</script>

<!--
	The app is light-only (no mode toggle), so ModeWatcher's inline head-priming
	script is redundant and would violate the nonce-based CSP. Skip it.
-->
<ModeWatcher defaultMode="light" disableHeadScriptInjection />

<QueryClientProvider client={queryClient}>
	<NavProgressBar />
	<ImpersonationBanner />
	<PwaStatusBar />
	<AppShell>
		{@render children()}
	</AppShell>
	<Toaster />
</QueryClientProvider>
