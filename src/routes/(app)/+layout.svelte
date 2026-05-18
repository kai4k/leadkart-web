<script lang="ts">
	import AppShell from '$layouts/AppShell.svelte';
	import ImpersonationBanner from '$features/operator/impersonation/components/ImpersonationBanner.svelte';
	import { impersonation } from '$features/operator/impersonation/stores/impersonation.svelte';
	import { session } from '$features/auth/stores/session.svelte';

	let { children } = $props();

	$effect(() => {
		if (session.principal) {
			impersonation.reconcile().catch(() => {});
		}
	});
</script>

<ImpersonationBanner />
<AppShell>
	{@render children()}
</AppShell>
