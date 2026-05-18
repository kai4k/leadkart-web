<script lang="ts">
	import PersonDetail from '$features/operator/people/components/PersonDetail.svelte';
	import { personDetailQuery } from '$features/operator/people/queries';

	let { data } = $props();

	const personId = $derived(data.personId);
	const query = $derived(personDetailQuery(personId));
	const title = $derived(query.data?.email ?? 'Person');
</script>

<svelte:head><title>{title} · LeadKart</title></svelte:head>

<PersonDetail {personId} />
