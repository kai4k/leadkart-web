<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import AppShell from '$layouts/AppShell.svelte';
	import ImpersonationBanner from '$features/operator/impersonation/components/ImpersonationBanner.svelte';
	import { impersonation } from '$features/operator/impersonation/stores/impersonation.svelte';
	import { myCapabilitiesQuery } from '$features/auth/queries';
	import { queryClient } from '$lib/api/query-client';
	import Toaster from '$lib/components/ui/Toaster.svelte';

	let { children } = $props();

	// Reconcile impersonation state once capabilities are resolved
	// (capsQuery.data signals the user is authenticated and their
	// permissions are known — safer than the synchronous principal check).
	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data) {
			impersonation.reconcile().catch(() => {});
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<ImpersonationBanner />
	<AppShell>
		{@render children()}
	</AppShell>
	<Toaster />
</QueryClientProvider>
