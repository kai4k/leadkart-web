<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { resolve } from '$app/paths';
	import { EmptyState } from '$ui';
	import { Search, Users } from '$icons';
	import {
		ResourceListPage,
		IdentityCell,
		type DataTableColumn
	} from '#lib/components/data/index.ts';
	import { DataTable } from '#lib/components/data/data-table/index.ts';
	import type { SearchPersonHit } from '$features/search/schemas';
	import { formatDate } from '#lib/utils/format.ts';
	import { displayName } from '#lib/utils/person-name.ts';
	import { PERSON_SEARCH_MIN, personsSearchQuery } from '../queries';
	import { limitSearchBytes } from '../api';

	/**
	 * The people of the platform, found by search. Go has no "list every person" route, so the page asks
	 * nothing until there is a search of at least two characters (`GET /v1/search?include=persons`). The
	 * text stays in this component: a person's email or name does not belong in the URL bar.
	 */
	let q = $state('');
	const enabled = $derived(q.length >= PERSON_SEARCH_MIN);

	const query = personsSearchQuery(() => q);
	const hits = $derived(enabled ? (query.data ?? []) : []);

	const nameOf = (p: SearchPersonHit) => displayName(p, { emailFallback: 'full' });

	const columns: DataTableColumn<SearchPersonHit>[] = [
		{ id: 'person', header: 'Person', accessor: nameOf, cell: personCell, primary: true },
		{
			id: 'created',
			header: 'Joined',
			accessor: (p) => formatDate(p.created_at),
			hideBelow: 'lg',
			class: 'text-muted-foreground'
		}
	];
</script>

{#snippet personCell(p: SearchPersonHit)}
	<IdentityCell name={nameOf(p)} subtitle={p.email} />
{/snippet}

{#snippet empty()}
	{#if !enabled}
		<EmptyState
			icon={Search}
			title="Search for a person"
			description="Type at least 2 characters of an email address or a name."
		/>
	{:else}
		<EmptyState
			icon={Users}
			title="No one matches '{q}'"
			description="Try a different email or name."
		/>
	{/if}
{/snippet}

<ResourceListPage
	title={$_('pages.platformUsers.title')}
	subtitle={$_('pages.platformUsers.description')}
	search={{
		value: q,
		onSearch: (next) => (q = limitSearchBytes(next)),
		label: 'Search people by email or name',
		placeholder: 'Search by email or name',
		maxlength: 100
	}}
>
	<DataTable
		{columns}
		data={hits}
		getRowId={(p) => p.id}
		noun="people"
		caption="People"
		query={enabled ? query : undefined}
		rowHref={(p) => resolve('/(app)/operator/persons/[id]', { id: p.id })}
		{empty}
	/>
</ResourceListPage>
