<script lang="ts">
	import { page } from '$app/state';
	import { Alert, Button } from '$ui';

	/**
	 * Tenant Settings error boundary — climbs to here when a load
	 * function under /settings/tenant/* throws, rather than the (app)
	 * group's +error.svelte. Keeps the user inside the AppShell with
	 * a settings-aware retry path instead of bouncing them to a
	 * generic full-page error.
	 *
	 * Per CLAUDE.md route-group rule: every layout group ships its
	 * own +error.svelte so error UI matches the surrounding layout.
	 */

	const status = $derived(page.status);
	const message = $derived(
		page.error?.message ?? 'Something went wrong loading the settings page.'
	);
</script>

<svelte:head>
	<title>{status} · Tenant Settings · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h1 class="h1">Tenant Settings</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">
			Manage your organisation's profile, statutory IDs, contact details, and platform preferences.
		</p>
	</header>

	<Alert variant="danger" title={`Error ${status}`}>
		{message}
	</Alert>

	<div class="cluster">
		<Button variant="primary" onclick={() => location.reload()}>Try again</Button>
		<a href="/dashboard"><Button variant="ghost">Back to dashboard</Button></a>
	</div>
</div>
