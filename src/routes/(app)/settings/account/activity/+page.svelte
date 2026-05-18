<script lang="ts">
	import { myActivityQuery } from '$lib/features/audit/queries';
	import ActivityTimeline from '$lib/features/audit/components/ActivityTimeline.svelte';
</script>

<svelte:head><title>My Activity · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h2 class="h4">My activity</h2>
		<p class="caption text-[var(--color-fg-muted)]">Your recent account actions and events.</p>
	</header>

	{#snippet activitySection()}
		{@const q = myActivityQuery()}
		<ActivityTimeline
			data={q.data ?? null}
			isPending={q.isPending}
			isError={q.isError}
			errorMessage={q.error instanceof Error ? q.error.message : 'Failed to load activity'}
		/>
	{/snippet}

	{@render activitySection()}
</div>
