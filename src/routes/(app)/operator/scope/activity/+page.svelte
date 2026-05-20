<script lang="ts">
	import { tenantActivityQuery } from '$lib/features/audit/queries';
	import ActivityTimeline from '$lib/features/audit/components/ActivityTimeline.svelte';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const activityQuery = $derived(tenantActivityQuery(data.tenant.id));
</script>

<svelte:head><title>Activity · {data.tenant.display_name} · LeadKart</title></svelte:head>

<ActivityTimeline
	data={activityQuery.data ?? null}
	isPending={activityQuery.isPending}
	isError={activityQuery.isError}
	errorMessage={activityQuery.error instanceof Error
		? activityQuery.error.message
		: 'Failed to load activity'}
/>
