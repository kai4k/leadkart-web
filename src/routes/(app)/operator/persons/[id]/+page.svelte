<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PersonDetail from '$features/operator/people/components/PersonDetail.svelte';
	import { personDetailQuery } from '$features/operator/people/queries';
	import { personDisplayName } from '$features/operator/people/view-models';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';
	import { Breadcrumbs } from '$ui';
	import type { BreadcrumbItem } from '$ui';

	let { data } = $props();

	const personId = $derived(data.personId);
	const query = $derived(personDetailQuery(personId));
	const title = $derived(query.data?.email ?? 'Person');
	const personName = $derived(query.data ? personDisplayName(query.data) : 'Person');

	const breadcrumbs = $derived<BreadcrumbItem[]>([
		{ href: '/operator', label: 'Operator' },
		{ href: '/operator/persons', label: 'Persons' },
		{ label: personName }
	]);

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'platform.users.view')) {
			goto(resolve('/dashboard'), { replaceState: true });
		}
	});
</script>

<svelte:head><title>{title} · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />
	<PersonDetail {personId} />
</div>
