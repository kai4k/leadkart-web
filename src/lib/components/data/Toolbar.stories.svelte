<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Toolbar from './Toolbar.svelte';
	import { Button } from '$ui/button';
	import TextField from '$lib/components/form/TextField.svelte';
	import * as Tabs from '$ui/tabs';
	import { Plus, Download, Filter, Search } from '$icons';

	const { Story } = defineMeta({
		title: 'Data/Toolbar',
		component: Toolbar,
		tags: ['autodocs']
	});
</script>

<Story name="Full layout (title + search + actions + tabs)">
	<div style="width: 100%; max-width: 1080px;">
		<Toolbar>
			{#snippet title()}
				<div class="stack stack-tight">
					<h1 class="h4">Tenants</h1>
					<p class="caption text-fg-muted">All tenants across the platform.</p>
				</div>
			{/snippet}
			{#snippet search()}
				<TextField placeholder="Search by name or GSTIN…" leadingIcon={Search} />
			{/snippet}
			{#snippet actions()}
				<Button variant="outline">
					<Filter size={14} />
					Filters
				</Button>
				<Button variant="outline">
					<Download size={14} />
					Export
				</Button>
				<Button>
					<Plus size={14} />
					Add tenant
				</Button>
			{/snippet}
			{#snippet tabs()}
				<Tabs.Root value="all">
					<Tabs.List>
						<Tabs.Trigger value="all">All (124)</Tabs.Trigger>
						<Tabs.Trigger value="active">Active (98)</Tabs.Trigger>
						<Tabs.Trigger value="suspended">Suspended (12)</Tabs.Trigger>
						<Tabs.Trigger value="pending">Pending (14)</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			{/snippet}
		</Toolbar>
	</div>
</Story>

<Story name="Title + actions only">
	<div style="width: 100%; max-width: 1080px;">
		<Toolbar>
			{#snippet title()}
				<h1 class="h4">Products</h1>
			{/snippet}
			{#snippet actions()}
				<Button>
					<Plus size={14} />
					Add product
				</Button>
			{/snippet}
		</Toolbar>
	</div>
</Story>

<Story name="Title only (simple page header)">
	<div style="width: 100%; max-width: 1080px;">
		<Toolbar>
			{#snippet title()}
				<div class="stack stack-tight">
					<h1 class="h4">Settings</h1>
					<p class="caption text-fg-muted">Manage your account preferences.</p>
				</div>
			{/snippet}
		</Toolbar>
	</div>
</Story>
