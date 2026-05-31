<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RadioGroup from './RadioGroup.svelte';
	import RadioItem from './RadioItem.svelte';

	const { Story } = defineMeta({
		title: 'Form/RadioGroup',
		component: RadioGroup,
		tags: ['autodocs']
	});
</script>

<Story name="Vertical (default)">
	<RadioGroup label="Business type" value="pcd" name="business-type">
		<RadioItem value="pcd" label="PCD Pharma" />
		<RadioItem value="third_party" label="Third-party manufacturer" />
	</RadioGroup>
</Story>

<Story name="Horizontal">
	<RadioGroup label="Medicine system" value="allopathic" orientation="horizontal" name="system">
		<RadioItem value="allopathic" label="Allopathic" />
		<RadioItem value="ayurvedic" label="Ayurvedic" />
	</RadioGroup>
</Story>

<Story name="With hint">
	<RadioGroup
		label="Pricing band"
		hint="Operator-approved override ±10% allowed at quote time."
		value="standard"
		name="pricing-band"
	>
		<RadioItem value="standard" label="Standard MRP" />
		<RadioItem value="promo" label="Promo (-5%)" />
		<RadioItem value="bulk" label="Bulk (-10%)" />
	</RadioGroup>
</Story>

<Story name="With error">
	<RadioGroup label="Drug schedule" error="Choose a schedule to continue." name="drug-schedule">
		<RadioItem value="H" label="Schedule H" />
		<RadioItem value="H1" label="Schedule H1" />
		<RadioItem value="X" label="Schedule X" />
	</RadioGroup>
</Story>

<Story name="Disabled">
	<RadioGroup label="Business type" value="pcd" disabled name="business-type-disabled">
		<RadioItem value="pcd" label="PCD Pharma" />
		<RadioItem value="third_party" label="Third-party manufacturer" />
	</RadioGroup>
</Story>
