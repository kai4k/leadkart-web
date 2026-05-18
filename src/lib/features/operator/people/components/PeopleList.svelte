<script lang="ts">
	import { Alert, Avatar, Badge, Button, Card, EmptyState } from '$ui';
	import { Users, Search, Icon } from '$icons';
	import { personDetailQuery } from '$features/operator/people/queries';
	import { personDisplayName, personLifecycleBadge } from '$features/operator/people/view-models';

	let search = $state('');
	let pending = $state(false);
	let lookedUpId = $state('');

	// Query — only fires when lookedUpId is set.
	const query = $derived(lookedUpId ? personDetailQuery(lookedUpId) : null);
	const personList = $derived(query?.data ? [query.data] : []);

	async function onSearch(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = search.trim();
		if (!trimmed) {
			lookedUpId = '';
			return;
		}
		lookedUpId = trimmed;
	}

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}

	const isLoading = $derived(query?.isPending ?? false);
	const isError = $derived(query?.isError ?? false);
	const errorMsg = $derived(query?.error instanceof Error ? query.error.message : 'Lookup failed');
</script>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h1 class="h1">Platform users</h1>
		<p class="caption text-[var(--color-fg-muted)]">Cross-tenant person identity management.</p>
	</header>

	<Alert variant="info" title="Discover platform users via tenants">
		Open a tenant from <a href="/operator/tenants" class="underline">/operator/tenants</a> to see its
		user roster; click any user to view their cross-tenant person record. The search below is for direct
		UUID lookup only.
	</Alert>

	<form class="cluster" onsubmit={onSearch}>
		<input
			type="search"
			placeholder="Person UUID (advanced)"
			bind:value={search}
			class="glass-input flex-1 rounded-md px-3 py-2 text-sm"
			aria-label="Person UUID lookup"
		/>
		<Button type="submit" loading={pending || isLoading}>
			<Icon icon={Search} size="sm" /> Look up
		</Button>
	</form>

	{#if isError}
		<Alert variant="danger" title="Lookup failed">{errorMsg}</Alert>
	{:else if personList.length === 0 && lookedUpId && !isLoading}
		<EmptyState icon={Users} title="No match" description="Try a different person ID." />
	{:else if personList.length > 0}
		<ul class="stack stack-tight" aria-label="People">
			{#each personList as p (p.id)}
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
	{:else}
		<EmptyState
			icon={Users}
			title="Search for a person"
			description="Paste a person ID above to load their detail page."
		/>
	{/if}
</div>
