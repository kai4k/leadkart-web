<script lang="ts">
	import PersonDetail from '$features/operator/people/components/PersonDetail.svelte';
	import { operatorPeople } from '$features/operator/people/stores/operator-people.svelte';

	let { data } = $props();

	$effect(() => {
		if (data.personId) {
			operatorPeople.loadDetail(data.personId).catch(() => {});
		}
	});
</script>

<svelte:head
	><title>{operatorPeople.current ? operatorPeople.current.email : 'Person'} · LeadKart</title
	></svelte:head
>

<PersonDetail />
