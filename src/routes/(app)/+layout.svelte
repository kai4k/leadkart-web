<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { ModeWatcher } from 'mode-watcher';
	import AppShell from '$layouts/AppShell.svelte';
	import NavProgressBar from '$layouts/NavProgressBar.svelte';
	import PwaStatusBar from '$layouts/PwaStatusBar.svelte';
	import ImpersonationBanner from '$features/operator/impersonation/components/ImpersonationBanner.svelte';
	import { queryClient } from '$lib/api/query-client';
	import { Toaster } from '$ui';

	let { children } = $props();
</script>

<ModeWatcher defaultMode="light" />

<QueryClientProvider client={queryClient}>
	<NavProgressBar />
	<ImpersonationBanner />
	<PwaStatusBar />
	<AppShell>
		{@render children()}
	</AppShell>
	<Toaster />
</QueryClientProvider>
