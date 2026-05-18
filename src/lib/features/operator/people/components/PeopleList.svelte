<script lang="ts">
	import { Alert, Avatar, Badge, Card, EmptyState, Spinner } from '$ui';
	import { Users, Search, Icon } from '$icons';
	import { personsListQuery } from '$features/operator/people/queries';
	import { personDisplayName, personLifecycleBadge } from '$features/operator/people/view-models';

	const DEBOUNCE_MS = 300;

	let searchInput = $state('');
	let debouncedSearch = $state('');
	let debounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	function onSearchInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debouncedSearch = searchInput.trim();
		}, DEBOUNCE_MS);
	}

	const queryParams = $derived(debouncedSearch ? { q: debouncedSearch, limit: 20 } : { limit: 20 });
	const query = $derived(personsListQuery(queryParams));

	const persons = $derived(query.data?.persons ?? []);

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}
</script>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h1 class="h1">Platform users</h1>
		<p class="caption text-[var(--color-fg-muted)]">Cross-tenant person identity management.</p>
	</header>

	<div class="cluster">
		<div class="relative flex-1">
			<span class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
				<Icon icon={Search} size="sm" class="text-[var(--color-fg-subtle)]" />
			</span>
			<input
				type="search"
				placeholder="Search by email or name"
				bind:value={searchInput}
				oninput={onSearchInput}
				class="glass-input w-full rounded-md py-2 pr-3 pl-9 text-sm"
				aria-label="Search persons by email or name"
			/>
		</div>
	</div>

	{#if query.isPending}
		<div class="flex justify-center py-8"><Spinner size={28} /></div>
	{:else if query.isError}
		<Alert variant="danger" title="Failed to load people">
			{query.error instanceof Error ? query.error.message : 'Unknown error'}
		</Alert>
	{:else if persons.length === 0}
		<EmptyState
			icon={Users}
			title={debouncedSearch ? `No results for "${debouncedSearch}"` : 'No persons found'}
			description={debouncedSearch
				? 'Try a different email or name.'
				: 'No persons in the platform yet.'}
		/>
	{:else}
		<ul class="stack stack-tight" aria-label="People">
			{#each persons as p (p.id)}
				{@const badge = personLifecycleBadge(p)}
				{@const displayName = personDisplayName(p)}
				<li>
					<Card.Root>
						<Card.Content class="grid grid-cols-[auto_1fr_auto] items-center gap-4">
							<Avatar initials={initials(displayName)} size="md" />
							<div class="stack stack-tight">
								<div class="cluster cluster-tight">
									<a
										href="/operator/persons/{p.id}"
										class="h5 text-[var(--color-fg)] hover:underline">{displayName}</a
									>
									<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
								</div>
								<p class="caption text-[var(--color-fg-muted)]">{p.email}</p>
							</div>
							<a
								href="/operator/persons/{p.id}"
								class="label text-[var(--color-primary)] hover:underline">Open →</a
							>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>
	{/if}
</div>
