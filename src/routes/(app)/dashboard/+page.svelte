<script lang="ts">
	import { session } from '$features/auth/stores/session.svelte';

	const principal = $derived(session.principal);
</script>

<svelte:head>
	<title>Dashboard · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<h1 class="h1">Dashboard</h1>
	<p class="body-sm text-[var(--color-fg-muted)]">
		Signed in as <code class="code-inline">{principal?.personId}</code>
		under tenant <code class="code-inline">{principal?.tenantId}</code>.
	</p>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each ['Open leads', 'Pending orders', 'Overdue tasks'] as label (label)}
			<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
				<p class="caption">{label}</p>
				<p class="display-2 mt-2">—</p>
			</div>
		{/each}
	</div>

	<div
		role="status"
		class="body-sm rounded-lg border border-[var(--color-warning-200,var(--color-warning-100))] bg-[var(--color-warning-50)] p-4 text-[var(--color-warning-900)]"
	>
		<strong>Placeholder:</strong> dashboard widgets land per module. v0.3 wires Platform stats; v0.4 wires
		CRM lead funnel; v0.5 wires Tasks; etc.
	</div>
</div>
