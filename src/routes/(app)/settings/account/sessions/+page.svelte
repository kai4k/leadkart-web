<script lang="ts">
	import { Skeleton } from '$ui';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { SessionsList } from '$features/auth';
	import { mySessionsQuery } from '$features/auth/queries';

	const sessionsQuery = mySessionsQuery();
</script>

<QueryState query={sessionsQuery} noun="sessions">
	{#snippet skeleton()}
		{#each [0, 1, 2] as i (i)}
			<Skeleton class="h-16 w-full rounded-md" />
		{/each}
	{/snippet}
	<SessionsList />
</QueryState>
