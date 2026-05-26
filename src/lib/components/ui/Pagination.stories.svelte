<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Pagination from './Pagination.svelte';

	/**
	 * Pagination — page-cursor strip with prev/next + numeric jump.
	 * Used at the bottom of every list view that exceeds the page-size.
	 */
	const { Story } = defineMeta({
		title: 'UI/Pagination',
		component: Pagination,
		tags: ['autodocs']
	});
</script>

<Story name="3 of 10 pages">
	<Pagination page={3} pageCount={10} onChange={() => {}} />
</Story>

<Story name="First page">
	<Pagination page={1} pageCount={10} onChange={() => {}} />
</Story>

<Story name="Last page">
	<Pagination page={10} pageCount={10} onChange={() => {}} />
</Story>

<Story name="Single page (no controls)">
	<Pagination page={1} pageCount={1} onChange={() => {}} />
</Story>
