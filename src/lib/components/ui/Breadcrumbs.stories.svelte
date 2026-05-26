<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Breadcrumbs from './Breadcrumbs.svelte';

	/**
	 * Breadcrumbs — hierarchical navigation trail.
	 * Industry refs: Stripe Dashboard breadcrumbs, GitHub repo path,
	 * Vercel project navigation. WAI-ARIA APG Breadcrumb pattern.
	 */
	const { Story } = defineMeta({
		title: 'UI/Breadcrumbs',
		component: Breadcrumbs,
		tags: ['autodocs']
	});
</script>

<Story name="Two levels">
	<Breadcrumbs
		items={[{ href: '/operator/tenants', label: 'Tenants' }, { label: 'Acme Pharma' }]}
	/>
</Story>

<Story name="Three levels">
	<Breadcrumbs
		items={[
			{ href: '/leads', label: 'Leads' },
			{ href: '/leads/123', label: 'Acme Wholesalers' },
			{ label: 'Call logs' }
		]}
	/>
</Story>

<Story name="Four levels">
	<Breadcrumbs
		items={[
			{ href: '/settings', label: 'Settings' },
			{ href: '/settings/tenant', label: 'Tenant' },
			{ href: '/settings/tenant/statutory', label: 'Statutory IDs' },
			{ label: 'GSTIN edit' }
		]}
	/>
</Story>
