<script lang="ts">
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { tenantActivityQuery } from '#lib/features/audit/queries.ts';
	import { ActivityTimeline } from '#lib/features/audit/index.ts';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const activityQuery = tenantActivityQuery(() => data.tenant.id);
</script>

<svelte:head
	><title>Activity · {plainTitle(data.tenant.display_name)} · LeadKart</title></svelte:head
>

<ActivityTimeline query={activityQuery} />
