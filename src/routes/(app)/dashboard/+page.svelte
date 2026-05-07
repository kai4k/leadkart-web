<script lang="ts">
	import { getSession } from '$features/auth/stores/session.svelte';

	const session = getSession();
</script>

<svelte:head>
	<title>Dashboard · LeadKart</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
	<p class="text-sm text-slate-600 dark:text-slate-400">
		Signed in as <code class="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800"
			>{session?.personId}</code
		>
		under tenant
		<code class="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800"
			>{session?.tenantId}</code
		>.
	</p>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each ['Open leads', 'Pending orders', 'Overdue tasks'] as label}
			<div
				class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
			>
				<p class="text-sm text-slate-500 dark:text-slate-400">{label}</p>
				<p class="mt-2 text-3xl font-semibold tracking-tight">—</p>
			</div>
		{/each}
	</div>

	<div
		class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
	>
		<strong>Placeholder:</strong> dashboard widgets land per module. v0.3 wires Platform stats; v0.4
		wires CRM lead funnel; v0.5 wires Tasks; etc.
	</div>
</div>
