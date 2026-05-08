<script lang="ts">
	import { page } from '$app/state';
	import { Alert, Button } from '$ui';

	/**
	 * Account-settings group error boundary. Per CLAUDE.md route-group
	 * rule: every layout group ships its own +error.svelte so error
	 * UI matches the surrounding layout. /settings/account/* loaders
	 * climb to here on throw rather than the (app) group's
	 * +error.svelte — keeps the user inside the AppShell with an
	 * account-aware retry path.
	 */

	const status = $derived(page.status);
	const message = $derived(
		page.error?.message ?? 'Something went wrong loading the account settings page.'
	);
</script>

<svelte:head>
	<title>{status} · Account & Security · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h1 class="h1">Account & Security</h1>
	</header>

	<Alert variant="danger" title={`Error ${status}`}>
		{message}
	</Alert>

	<div class="cluster">
		<Button variant="primary" onclick={() => location.reload()}>Try again</Button>
		<a href="/dashboard"><Button variant="ghost">Back to dashboard</Button></a>
	</div>
</div>
