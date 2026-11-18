<script lang="ts">
	import { PersonDetail, personDetailQuery, personDisplayName } from '$features/operator/people';
	import { Breadcrumbs, type BreadcrumbItem } from '$ui';

	let { data } = $props();

	const personId = $derived(data.personId);
	const query = $derived(personDetailQuery(personId));
	const title = $derived(query.data?.email ?? 'Person');
	const personName = $derived(query.data ? personDisplayName(query.data) : 'Person');

	const breadcrumbs = $derived<BreadcrumbItem[]>([
		{ label: 'Operator' },
		{ href: '/operator/persons', label: 'Persons' },
		{ label: personName }
	]);
</script>

<svelte:head><title>{title} · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />
	<PersonDetail {personId} />
</div>
