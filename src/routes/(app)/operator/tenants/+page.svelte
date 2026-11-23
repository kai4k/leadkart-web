<script lang="ts">
	import { TenantsList } from '$features/operator/tenants';
	import { createListSearch } from '#lib/hooks/index.ts';

	// the search text stays out of the URL; Back brings it back
	const search = createListSearch();
	export const snapshot = search.snapshot;
</script>

<svelte:head><title>Tenants · LeadKart</title></svelte:head>

<TenantsList {search} />
