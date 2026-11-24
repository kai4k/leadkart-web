<script lang="ts">
	import { myActivityQuery } from '#lib/features/audit/queries.ts';
	import { ActivityTimeline } from '#lib/features/audit/index.ts';
</script>

<svelte:head><title>My Activity · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h2 class="h4">My activity</h2>
		<p class="caption text-muted-foreground">Your recent account actions and events.</p>
	</header>

	{#snippet activitySection()}
		{@const q = myActivityQuery()}
		<ActivityTimeline query={q} />
	{/snippet}

	{@render activitySection()}
</div>
