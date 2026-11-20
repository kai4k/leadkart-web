<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Alert, Button } from '$ui';

	/**
	 * Tenant Settings error boundary — renders when a page load or
	 * action under /settings/tenant/* throws. NOTE: errors thrown by this
	 * directory's own +layout.server.ts load are rendered by the PARENT
	 * error page (`(app)/+error.svelte`), since a layout's error cannot be
	 * caught by a boundary at the same level.
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
		<p class="body-sm text-fg-muted">
			Manage your organisation's profile, statutory IDs, contact details, and platform preferences.
		</p>
	</header>

	<Alert variant="destructive" title={`Error ${status}`}>
		{message}
	</Alert>

	<div class="cluster">
		<Button variant="default" onclick={() => location.reload()}>Try again</Button>

		<a href={resolve('dashboard')}><Button variant="ghost">Back to dashboard</Button></a>
	</div>
</div>
