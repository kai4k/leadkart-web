<script lang="ts">
	import { Alert, Skeleton } from '$ui';
	import { SessionsList } from '$features/auth';
	import { mySessionsQuery } from '$features/auth/queries';
	import { describeError } from '$api/errors';

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
		>{describeError(sessionsQuery.error, { fallback: 'Failed to load sessions' })}</Alert
	>
{:else}
	<SessionsList />
{/if}
