<script lang="ts">
	import AuthShell from '$layouts/AuthShell.svelte';
	import NavProgressBar from '$layouts/NavProgressBar.svelte';

	import { onMount } from 'svelte';
	import { clearUserBrowserState } from '#lib/api/query-client.ts';

	let { children } = $props();

	// Every arrival at an auth page means no session (or a new one is about to
	// start): the previous user's cached queries, offline pages and data must go,
	// including when the session was ended by a server redirect.
	onMount(() => {
		void clearUserBrowserState();
	});
</script>

<NavProgressBar />
<AuthShell>
	{@render children()}
</AuthShell>
