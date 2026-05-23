<script lang="ts">
	import { Alert, Skeleton } from '$ui';
	import SessionsList from '$features/auth/components/SessionsList.svelte';
	import { mySessionsQuery } from '$features/auth/queries';

	const sessionsQuery = mySessionsQuery();
</script>

{#if sessionsQuery.isPending}
	<div class="stack stack-tight" aria-busy="true" aria-label="Loading sessions">
		{#each [0, 1, 2] as i (i)}
			<Skeleton class="h-16 w-full rounded-md" />
		{/each}
	</div>
{:else if sessionsQuery.isError}
	<Alert variant="danger"
		>{sessionsQuery.error instanceof Error
			? sessionsQuery.error.message
			: 'Failed to load sessions'}</Alert
	>
{:else}
	<SessionsList />
{/if}
