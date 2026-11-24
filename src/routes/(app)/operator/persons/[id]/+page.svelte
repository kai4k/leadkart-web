<script lang="ts">
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { _ } from 'svelte-i18n';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import {
		PersonDetail,
		personDetailQuery,
		personDisplayName
	} from '#lib/features/operator/people/index.ts';

	let { data } = $props();

	const personId = $derived(data.personId);
	const query = personDetailQuery(() => data.personId);
	const title = $derived(query.data?.email ?? 'Person');
	const personName = $derived(query.data ? personDisplayName(query.data) : 'Person');

	const crumbs = $derived([
		{ label: $_('nav.sections.operator') },
		{ href: '/operator/persons', label: $_('nav.items.persons') },
		{ label: personName }
	]);
</script>

<svelte:head><title>{plainTitle(title)} · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<PageHeader title={personName} {crumbs} />
	<PersonDetail {personId} />
</div>
