<script lang="ts">
	import { session } from '$features/auth/stores/session.svelte';
	import { Alert, Card } from '$ui';

	const principal = $derived(session.principal);

	const stats = [{ label: 'Open leads' }, { label: 'Pending orders' }, { label: 'Overdue tasks' }];
</script>

<svelte:head>
	<title>Dashboard · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h1 class="h1">Dashboard</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">
			Signed in as <code class="code-inline">{principal?.personId}</code>
			under tenant <code class="code-inline">{principal?.tenantId}</code>.
		</p>
	</header>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each stats as stat (stat.label)}
			<Card.Root>
				<Card.Header>
					<Card.Description>{stat.label}</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="display-2 tabular-nums">—</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<Alert variant="warning" title="Placeholder">
		Dashboard widgets land per module. v0.3 wires Platform stats; v0.4 wires CRM lead funnel; v0.5
		wires Tasks; etc.
	</Alert>
</div>
