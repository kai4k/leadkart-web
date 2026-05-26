<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Logo from './Logo.svelte';

	const { Story } = defineMeta({
		title: 'UI/Logo',
		component: Logo,
		tags: ['autodocs']
	});
</script>

<Story name="Size scale">
	<div class="stack stack-loose items-start">
		<div class="cluster cluster-tight items-end">
			<Logo size="xs" />
			<span class="caption text-fg-muted">xs · 24px</span>
		</div>
		<div class="cluster cluster-tight items-end">
			<Logo size="sm" />
			<span class="caption text-fg-muted">sm · 32px</span>
		</div>
		<div class="cluster cluster-tight items-end">
			<Logo size="md" />
			<span class="caption text-fg-muted">md · 40px (default)</span>
		</div>
		<div class="cluster cluster-tight items-end">
			<Logo size="lg" />
			<span class="caption text-fg-muted">lg · 56px</span>
		</div>
		<div class="cluster cluster-tight items-end">
			<Logo size="xl" />
			<span class="caption text-fg-muted">xl · 80px</span>
		</div>
		<div class="cluster cluster-tight items-end">
			<Logo size="2xl" />
			<span class="caption text-fg-muted">2xl · 112px (auth hero)</span>
		</div>
	</div>
</Story>

<Story name="In a topbar">
	<div
		class="bg-bg-elevated border-border flex items-center gap-3 rounded-md border px-4 py-2"
		style="width: 480px;"
	>
		<Logo size="sm" />
		<span class="body-sm text-fg-muted">/ Tenants / Acme Pharma</span>
	</div>
</Story>
