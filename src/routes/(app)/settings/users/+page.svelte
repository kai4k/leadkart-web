<script lang="ts">
	import { UsersList } from '$features/users';
	import { createListSearch } from '#lib/hooks/index.ts';

	// the search text stays out of the URL; Back brings it back
	const search = createListSearch();
	export const snapshot = search.snapshot;
</script>

<svelte:head>
	<title>Team · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<UsersList {search} />
</div>
