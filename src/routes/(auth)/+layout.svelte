<script lang="ts">
	import AuthShell from '$layouts/AuthShell.svelte';
	import NavProgressBar from '$layouts/NavProgressBar.svelte';

	let { children } = $props();
</script>

<NavProgressBar />
<AuthShell>
	{@render children()}
</AuthShell>
