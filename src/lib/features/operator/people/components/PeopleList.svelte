<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { resolve } from '$app/paths';
	import { Alert, Button, EmptyState } from '$ui';
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
	import type { ListSearch } from '#lib/hooks/index.ts';

	/**
	 * The people of the platform, found by search. Go has no "list every person" route, so the page asks
	 * nothing until there is a search of at least two characters (`GET /v1/search?include=persons`). The
	 * text stays in the page (`search`, restored by its `snapshot` on Back): a person's email or name does not
	 * belong in the URL bar.
	 */
	let { search }: { search: ListSearch } = $props();
	const q = $derived(search.value);
	const enabled = $derived(q.length >= PERSON_SEARCH_MIN);

	const query = personsSearchQuery(() => q);
	const hits = $derived(enabled ? (query.data?.persons ?? []) : []);
	// Go gave up on the search after its time limit: what is listed (often nothing) is not the whole answer.
	const partial = $derived(enabled && query.data?.has_partial === true);

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

{#snippet tookTooLong()}
	<Alert variant="warning" title={$_('pages.platformUsers.searchSlow.title')}>
		<div class="stack stack-tight">
			<p>{$_('pages.platformUsers.searchSlow.description')}</p>
			<div>
				<Button variant="ghost" size="sm" onclick={() => query.refetch()}
					>{$_('common.query.tryAgain')}</Button
				>
			</div>
		</div>
	</Alert>
{/snippet}

{#snippet empty()}
	{#if !enabled}
		<EmptyState
			icon={Search}
			title="Search for a person"
			description="Type at least 2 characters of an email address or a name."
		/>
	{:else if partial}
		<!-- never "No one matches": the search did not finish, so nobody can say that -->
		{@render tookTooLong()}
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
		onSearch: (next) => (search.value = limitSearchBytes(next)),
		label: 'Search people by email or name',
		placeholder: 'Search by email or name',
		maxlength: 100
	}}
>
	{#if partial && hits.length > 0}
		{@render tookTooLong()}
	{/if}
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
