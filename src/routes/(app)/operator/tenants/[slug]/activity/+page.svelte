<script lang="ts">
	import { tenantBySlugQuery } from '$features/operator/tenants/queries';
	import { tenantActivityQuery } from '$lib/features/audit/queries';
	import ActivityTimeline from '$lib/features/audit/components/ActivityTimeline.svelte';
	import { Spinner, Alert } from '$ui';

	let { data } = $props();

	const slug = $derived(data.slug);
	const tenantQuery = $derived(tenantBySlugQuery(slug));
	const tenantId = $derived(tenantQuery.data?.id ?? '');

	const activityQuery = $derived(tenantId ? tenantActivityQuery(tenantId) : null);
</script>

<svelte:head><title>Activity · LeadKart</title></svelte:head>

{#if tenantQuery.isPending}
	<div class="flex justify-center py-8"><Spinner size={28} /></div>
{:else if tenantQuery.isError || !tenantId}
	<Alert variant="warning" title="Tenant not found">Could not load tenant context.</Alert>
{:else}
	<ActivityTimeline
		data={activityQuery?.data ?? null}
		isPending={activityQuery?.isPending ?? true}
		isError={activityQuery?.isError ?? false}
		errorMessage={activityQuery?.error instanceof Error
			? activityQuery.error.message
			: 'Failed to load activity'}
	/>
{/if}
