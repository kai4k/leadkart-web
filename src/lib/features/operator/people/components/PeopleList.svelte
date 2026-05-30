<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Avatar, Badge, DataTable, EmptyState } from '$ui';
	import type { DataTableColumn } from '$ui';
	import { Users, Search, Icon } from '$icons';
	import { personsListQuery } from '$features/operator/people/queries';
	import { personDisplayName, personLifecycleBadge } from '$features/operator/people/view-models';
	import type { PersonDto } from '$features/operator/people/types';
	import { ApiError } from '$api/errors';
	import { resolveHref } from '$lib/utils/cn';

	const DEBOUNCE_MS = 300;

	// URL is the single source of truth for search state.
	const urlSearch = $derived(page.url.searchParams.get('q') ?? '');

	let debounceHandle: ReturnType<typeof setTimeout> | undefined;

	function onSearchInput(e: Event) {
		const value = (e.currentTarget as HTMLInputElement).value;
		clearTimeout(debounceHandle);
		debounceHandle = setTimeout(() => {
			const next = new SvelteURLSearchParams(page.url.searchParams.toString());
			if (value.trim()) {
				next.set('q', value.trim());
			} else {
				next.delete('q');
			}
			goto(`?${next}`, { replaceState: true, keepFocus: true });
		}, DEBOUNCE_MS);
	}

	const queryParams = $derived(urlSearch ? { q: urlSearch, limit: 20 } : { limit: 20 });
	const query = $derived(personsListQuery(queryParams));

	const persons = $derived(query.data?.persons ?? []);

	const tableState = $derived(
		query.isPending ? 'loading' : query.isError ? 'error' : persons.length === 0 ? 'empty' : 'ready'
	);

	function personInitials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}

	const columns: DataTableColumn<PersonDto>[] = [
		{
			id: 'person',
			header: 'Person',
			accessor: (p) => personDisplayName(p),
			cell: personCell
		},
		{
			id: 'status',
			header: 'Status',
			accessor: (p) => (p.is_active ? 'active' : 'inactive'),
			cell: statusCell
		},
		{
			id: 'created',
			header: 'Joined',
			accessor: 'created_at',
			hideBelow: 'lg',
			cell: dateCell
		}
	];
</script>

{#snippet personCell(p: PersonDto)}
	{@const name = personDisplayName(p)}
	<div class="cluster cluster-tight">
		<Avatar initials={personInitials(name)} size="md" />
		<div class="stack stack-tight min-w-0">
			<a
				href={resolveHref(`/operator/persons/${p.id}`)}
				class="text-fg hover:text-primary truncate font-medium hover:underline">{name}</a
			>
			<span class="caption text-fg-muted truncate">{p.email}</span>
		</div>
	</div>
{/snippet}

{#snippet statusCell(p: PersonDto)}
	{@const badge = personLifecycleBadge(p)}
	<Badge variant={badge.variant} appearance="soft" size="sm">{badge.label}</Badge>
{/snippet}

{#snippet dateCell(p: PersonDto)}
	<span class="caption text-fg-muted">{new Date(p.created_at).toLocaleDateString()}</span>
{/snippet}

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h1 class="h1">Platform users</h1>
		<p class="caption text-fg-muted">Cross-tenant person identity management.</p>
	</header>

	<div class="flex flex-col gap-3 md:flex-row md:items-center">
		<div class="relative flex-1">
			<span class="pointer-events-none absolute inset-y-0 start-3 flex items-center">
				<Icon icon={Search} size="sm" class="text-fg-subtle" />
			</span>
			<input
				type="search"
				placeholder="Search by email or name"
				value={urlSearch}
				oninput={onSearchInput}
				class="glass-input w-full rounded-md py-2 ps-9 pe-3 text-sm"
				aria-label="Search persons by email or name"
			/>
		</div>
	</div>

	<DataTable.Root
		{columns}
		rows={persons}
		rowKey={(p) => p.id}
		state={tableState}
		error={query.error instanceof ApiError ? query.error.message : null}
	>
		{#snippet emptyState()}
			<EmptyState
				icon={Users}
				title={urlSearch ? `No results for "${urlSearch}"` : 'No persons found'}
				description={urlSearch
					? 'Try a different email or name.'
					: 'No persons in the platform yet.'}
			/>
		{/snippet}
	</DataTable.Root>
</div>
