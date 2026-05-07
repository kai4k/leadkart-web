<script lang="ts">
	import { page } from '$app/state';
	import { Alert, Button, Card } from '$ui';

	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? 'Something went wrong loading this page.');

	const isAuthError = $derived(status === 401 || status === 403);
</script>

<svelte:head>
	<title>{status} · LeadKart</title>
</svelte:head>

<div class="container-narrow stack stack-relaxed py-12">
	<Card.Root>
		<Card.Header>
			<p class="overline">Error {status}</p>
			<Card.Title
				>{isAuthError ? 'Session expired or access denied' : 'Something went wrong'}</Card.Title
			>
			<Card.Description>{message}</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if isAuthError}
				<Alert variant="warning" title="Re-authenticate to continue">
					Your session may have expired. Sign in again to pick up where you left off.
				</Alert>
			{:else}
				<Alert variant="danger" title="The route loader threw">
					This is usually a transient network or backend issue. Try again — if it keeps happening,
					open the dev console and check the network tab for the failing request.
				</Alert>
			{/if}
		</Card.Content>
		<Card.Footer>
			<Button variant="primary" onclick={() => location.reload()}>Try again</Button>
			{#if isAuthError}
				<a href="/signin">
					<Button variant="tonal">Sign in</Button>
				</a>
			{:else}
				<a href="/dashboard">
					<Button variant="ghost">Back to dashboard</Button>
				</a>
			{/if}
		</Card.Footer>
	</Card.Root>
</div>
