<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import AppShell from '$layouts/AppShell.svelte';
	import NavProgressBar from '$layouts/NavProgressBar.svelte';
	import PwaStatusBar from '$layouts/PwaStatusBar.svelte';
	import ImpersonationBanner from '$features/operator/impersonation/components/ImpersonationBanner.svelte';
	import { queryClient } from '$lib/api/query-client';
	import Toaster from '$lib/components/ui/Toaster.svelte';

	let { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
	<NavProgressBar />
	<ImpersonationBanner />
	<PwaStatusBar />
	<AppShell>
		{@render children()}
	</AppShell>
	<Toaster />
</QueryClientProvider>
