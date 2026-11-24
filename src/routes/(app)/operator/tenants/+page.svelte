<script lang="ts">
	import { TenantsList } from '#lib/features/operator/tenants/index.ts';
	import { createListSearch } from '#lib/hooks/index.ts';

	// the search text stays out of the URL; Back brings it back
	const search = createListSearch();
	export const snapshot = search.snapshot;
</script>

<svelte:head><title>Tenants · LeadKart</title></svelte:head>

<TenantsList {search} />
