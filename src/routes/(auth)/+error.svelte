<script lang="ts">
	import { page } from '$app/state';
	import { Alert, Button } from '$ui';

	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? 'Something went wrong while loading this page.');
</script>

<svelte:head>
	<title>{status} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<div class="stack stack-tight">
		<p class="overline">Error {status}</p>
		<h1 class="h1">We hit a snag</h1>
	</div>

	<Alert variant="danger" title="Could not complete your request">
		{message}
	</Alert>

	<div class="cluster">
		<Button variant="primary" onclick={() => page.url && location.reload()}>Try again</Button>
		<a href="/signin">
			<Button variant="ghost">Back to sign in</Button>
		</a>
	</div>
</div>
