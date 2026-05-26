<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Combobox from './Combobox.svelte';

	const { Story } = defineMeta({
		title: 'Form/Combobox',
		component: Combobox,
		tags: ['autodocs']
	});

	const PRODUCTS = [
		{ value: 'p_1', label: 'Cetirizine 10mg' },
		{ value: 'p_2', label: 'Cefixime 200mg' },
		{ value: 'p_3', label: 'Paracetamol 500mg' },
		{ value: 'p_4', label: 'Amoxicillin 500mg' },
		{ value: 'p_5', label: 'Pantoprazole 40mg' }
	];
</script>

<Story name="Empty">
	<div style="width: 360px;">
		<Combobox label="Product" options={PRODUCTS} placeholder="Search product…" />
	</div>
</Story>

<Story name="With value">
	<div style="width: 360px;">
		<Combobox label="Product" options={PRODUCTS} value="p_3" />
	</div>
</Story>

<Story name="With hint">
	<div style="width: 360px;">
		<Combobox
			label="Product"
			hint="Type at least 2 characters to filter."
			options={PRODUCTS}
			placeholder="Search product…"
		/>
	</div>
</Story>

<Story name="With error">
	<div style="width: 360px;">
		<Combobox
			label="Product"
			options={PRODUCTS}
			error="This product is out of stock."
			value="p_3"
		/>
	</div>
</Story>

<Story name="Loading">
	<div style="width: 360px;">
		<Combobox label="Product" options={[]} loading placeholder="Searching…" />
	</div>
</Story>

<Story name="Empty state (no matches)">
	<div style="width: 360px;">
		<Combobox
			label="Product"
			options={[]}
			emptyState="No products match your search."
			placeholder="Type to search…"
		/>
	</div>
</Story>
