<script lang="ts">
	import { Skeleton } from '#lib/components/ui/index.ts';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { SessionsList } from '#lib/features/auth/index.ts';
	import { mySessionsQuery } from '#lib/features/auth/queries.ts';

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
