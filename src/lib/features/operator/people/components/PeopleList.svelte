<script lang="ts">
	import { Alert, Avatar, Badge, Button, Card, EmptyState } from '$ui';
	import { Users, Search, Icon } from '$icons';
	import { operatorPeople } from '$features/operator/people/stores/operator-people.svelte';
	import { personDisplayName, personLifecycleBadge } from '$features/operator/people/view-models';

	let search = $state('');
	let pending = $state(false);

	async function onSearch(e: SubmitEvent) {
		e.preventDefault();
		pending = true;
		try {
			await operatorPeople.lookupById(search.trim());
		} finally {
			pending = false;
		}
	}

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

	<Alert variant="info">
		Person listing endpoint pending on the backend. For now, look up a person by their ID below.
	</Alert>

	<form class="cluster" onsubmit={onSearch}>
		<input
			type="search"
			placeholder="Person ID (UUID)"
			bind:value={search}
			class="glass-input flex-1 rounded-md px-3 py-2 text-sm"
		/>
		<Button type="submit" loading={pending || operatorPeople.status === 'loading'}>
			<Icon icon={Search} size="sm" /> Look up
		</Button>
	</form>

	{#if operatorPeople.status === 'error' && operatorPeople.error}
		<Alert variant="danger" title="Lookup failed">{operatorPeople.error}</Alert>
	{:else if operatorPeople.list.length === 0 && operatorPeople.status !== 'idle'}
		<EmptyState icon={Users} title="No match" description="Try a different person ID." />
	{:else if operatorPeople.list.length > 0}
		<ul class="stack stack-tight" aria-label="People">
			{#each operatorPeople.list as p (p.id)}
				{@const badge = personLifecycleBadge(p)}
				{@const displayName = personDisplayName(p)}
				<li>
					<Card.Root>
						<Card.Content class="grid grid-cols-[auto_1fr_auto] items-center gap-4">
							<Avatar initials={initials(displayName)} size="md" />
							<div class="stack stack-tight">
								<div class="cluster cluster-tight">
									<a
										href="/operator/people/{p.id}"
										class="h5 text-[var(--color-fg)] hover:underline">{displayName}</a
									>
									<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
								</div>
								<p class="caption text-[var(--color-fg-muted)]">{p.email}</p>
							</div>
							<a
								href="/operator/people/{p.id}"
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
