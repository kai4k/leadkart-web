<script lang="ts">
	import AuthShell from '$layouts/AuthShell.svelte';
	import NavProgressBar from '$layouts/NavProgressBar.svelte';

	import { onMount } from 'svelte';
	import { clearPrivateCaches } from '#lib/utils/private-caches.ts';

	let { children } = $props();

	// Every arrival at an auth page means no session (or a new one is about to
	// start): offline copies of the previous user's pages and data must go.
	onMount(() => {
		void clearPrivateCaches();
	});
</script>

<NavProgressBar />
<AuthShell>
	{@render children()}
</AuthShell>
