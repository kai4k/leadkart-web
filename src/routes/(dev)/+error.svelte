<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Alert, Button } from '$ui';

	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? 'Something broke in this dev surface.');
</script>

<svelte:head>
	<title>{status} · Dev</title>
</svelte:head>

<div class="stack stack-relaxed container mx-auto py-12">
	<div class="stack stack-tight">
		<p class="overline">Error {status}</p>
		<h1 class="h1">Dev page failed to load</h1>
	</div>

	<Alert variant="danger" title="Something went wrong">
		{message}
	</Alert>

	<div class="cluster">
		<Button variant="primary" onclick={() => location.reload()}>Try again</Button>
		<a href={resolve('/dashboard')}>
			<Button variant="ghost">Back to dashboard</Button>
		</a>
	</div>
</div>
