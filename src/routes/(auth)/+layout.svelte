<script lang="ts">
	import AuthShell from '$layouts/AuthShell.svelte';

	let { children } = $props();
</script>

<AuthShell>
	{@render children()}
</AuthShell>
