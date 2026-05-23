<script lang="ts">
	import { page } from '$app/state';
	import LeadDetail from '$features/leads/components/LeadDetail.svelte';

	const id = $derived(page.params.id ?? '');
</script>

<svelte:head><title>Lead · LeadKart</title></svelte:head>

<LeadDetail {id} />
