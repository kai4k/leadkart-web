<script lang="ts">
	import { Alert, Spinner } from '$ui';
	import SessionsList from '$features/auth/components/SessionsList.svelte';
	import { mySessionsQuery } from '$features/auth/queries';

	const sessionsQuery = mySessionsQuery();
</script>

{#if sessionsQuery.isPending}
	<div class="cluster"><Spinner size={32} /> Loading sessions…</div>
{:else if sessionsQuery.isError}
	<Alert variant="danger"
		>{sessionsQuery.error instanceof Error
			? sessionsQuery.error.message
			: 'Failed to load sessions'}</Alert
	>
{:else}
	<SessionsList />
{/if}
