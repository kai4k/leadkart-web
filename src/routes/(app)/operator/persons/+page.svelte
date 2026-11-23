<script lang="ts">
	import { PeopleList } from '$features/operator/people';
	import { createListSearch } from '#lib/hooks/index.ts';

	// the search text stays out of the URL; Back brings it back
	const search = createListSearch();
	export const snapshot = search.snapshot;
</script>

<svelte:head><title>Platform users · LeadKart</title></svelte:head>

<PeopleList {search} />
