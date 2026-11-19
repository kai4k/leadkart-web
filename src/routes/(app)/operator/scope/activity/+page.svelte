<script lang="ts">
	import { tenantActivityQuery } from '#lib/features/audit/queries.ts';
	import { ActivityTimeline } from '$features/audit';
	import { describeError } from '$api/errors';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const activityQuery = $derived(tenantActivityQuery(data.tenant.id));
</script>

<svelte:head><title>Activity · {data.tenant.display_name} · LeadKart</title></svelte:head>

<ActivityTimeline
	data={activityQuery.data ?? null}
	isPending={activityQuery.isPending}
	isError={activityQuery.isError}
	errorMessage={describeError(activityQuery.error, { fallback: 'Failed to load activity' })}
/>
