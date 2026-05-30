<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Users, Building2, Inbox, Plus, Icon } from '$lib/icons';
	import EmptyState from './EmptyState.svelte';
	import { Button } from './button';

	/**
	 * EmptyState — no-data placeholder.
	 *
	 * Composition: icon + title + description + primary CTA (optional).
	 * Industry refs: Shopify Polaris EmptyState, Linear "Get started"
	 * panels, GitHub no-results screens.
	 */
	const { Story } = defineMeta({
		title: 'UI/EmptyState',
		component: EmptyState,
		tags: ['autodocs']
	});
</script>

<Story name="Title only">
	<EmptyState title="No results" />
</Story>

<Story name="With description">
	<EmptyState
		title="No tenants yet"
		description="Onboard your first tenant to start using the platform."
	/>
</Story>

<Story name="With icon + CTA">
	<EmptyState
		title="No team members yet"
		description="Add your first teammate to start collaborating."
	>
		{#snippet icon()}
			<Icon icon={Users} size="lg" class="text-fg-subtle" />
		{/snippet}
		{#snippet action()}
			<Button variant="primary">
				<Icon icon={Plus} size="sm" /> Add member
			</Button>
		{/snippet}
	</EmptyState>
</Story>

<Story name="No results (search)">
	<EmptyState title="No matches" description="Try a different search term or clear the filter.">
		{#snippet icon()}
			<Icon icon={Inbox} size="lg" class="text-fg-subtle" />
		{/snippet}
	</EmptyState>
</Story>

<Story name="Tenant directory empty">
	<EmptyState
		title="No tenants"
		description="The directory is empty. Operator can onboard the first tenant from the action menu."
	>
		{#snippet icon()}
			<Icon icon={Building2} size="lg" class="text-fg-subtle" />
		{/snippet}
		{#snippet action()}
			<Button variant="primary">Onboard tenant</Button>
		{/snippet}
	</EmptyState>
</Story>
