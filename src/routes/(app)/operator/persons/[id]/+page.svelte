<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PageHeader from '$layouts/PageHeader.svelte';
	import { PersonDetail, personDetailQuery, personDisplayName } from '$features/operator/people';

	let { data } = $props();

	const personId = $derived(data.personId);
	const query = $derived(personDetailQuery(personId));
	const title = $derived(query.data?.email ?? 'Person');
	const personName = $derived(query.data ? personDisplayName(query.data) : 'Person');

	const crumbs = $derived([
		{ label: $_('nav.sections.operator') },
		{ href: '/operator/persons', label: $_('nav.items.persons') },
		{ label: personName }
	]);
</script>

<svelte:head><title>{title} · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<PageHeader title={personName} {crumbs} />
	<PersonDetail {personId} />
</div>
