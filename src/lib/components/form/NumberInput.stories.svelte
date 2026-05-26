<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NumberInput from './NumberInput.svelte';

	const { Story } = defineMeta({
		title: 'Form/NumberInput',
		component: NumberInput,
		tags: ['autodocs']
	});
</script>

<Story name="Default (integer)">
	<div style="width: 240px;">
		<NumberInput label="Quantity" value={1} min={1} step={1} />
	</div>
</Story>

<Story name="With prefix (currency)">
	<div style="width: 240px;">
		<NumberInput label="Unit price" value={120.5} prefix="₹" precision={2} step={0.01} />
	</div>
</Story>

<Story name="With suffix (percentage)">
	<div style="width: 240px;">
		<NumberInput label="GST %" value={18} suffix="%" min={0} max={28} step={0.1} precision={1} />
	</div>
</Story>

<Story name="With min/max + error">
	<div style="width: 240px;">
		<NumberInput
			label="Token validity (minutes)"
			value={120}
			min={5}
			max={60}
			error="Maximum is 60 minutes."
		/>
	</div>
</Story>

<Story name="Disabled">
	<div style="width: 240px;">
		<NumberInput label="Quantity" value={1} disabled />
	</div>
</Story>
