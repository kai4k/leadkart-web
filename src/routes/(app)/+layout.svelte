<script lang="ts">
	import AppShell from '$layouts/AppShell.svelte';

	let { children } = $props();
</script>

<AppShell>
	{@render children()}
</AppShell>
