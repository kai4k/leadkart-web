<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import AppShell from '$layouts/AppShell.svelte';
	import ImpersonationBanner from '$features/operator/impersonation/components/ImpersonationBanner.svelte';
	import { impersonation } from '$features/operator/impersonation/stores/impersonation.svelte';
	import { session } from '$features/auth/stores/session.svelte';
	import { queryClient } from '$lib/api/query-client';
	import Toaster from '$lib/components/ui/Toaster.svelte';

	let { children } = $props();

	$effect(() => {
		if (session.principal) {
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
