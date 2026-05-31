<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Select from './Select.svelte';

	const { Story } = defineMeta({
		title: 'Form/Select',
		component: Select,
		tags: ['autodocs']
	});

	const TIER_OPTIONS = [
		{ value: 'tenant-user', label: 'Tenant user' },
		{ value: 'tenant-admin', label: 'Tenant admin' },
		{ value: 'platform-staff', label: 'Platform staff' },
		{ value: 'platform-super', label: 'Platform super-user' }
	];

	const STATE_OPTIONS = [
		{ value: 'AP', label: 'Andhra Pradesh' },
		{ value: 'KA', label: 'Karnataka' },
		{ value: 'MH', label: 'Maharashtra' },
		{ value: 'TN', label: 'Tamil Nadu' },
		{ value: 'WB', label: 'West Bengal' }
	];
</script>

<Story name="Default">
	<div style="width: 280px;">
		<Select label="Tier" options={TIER_OPTIONS} placeholder="Choose tier…" />
	</div>
</Story>

<Story name="With value">
	<div style="width: 280px;">
		<Select label="Tier" options={TIER_OPTIONS} value="tenant-admin" />
	</div>
</Story>

<Story name="With hint">
	<div style="width: 280px;">
		<Select
			label="State"
			hint="Used for GST jurisdiction validation."
			options={STATE_OPTIONS}
			value="MH"
		/>
	</div>
</Story>

<Story name="With error">
	<div style="width: 280px;">
		<Select
			label="Tier"
			options={TIER_OPTIONS}
			error="Choose a tier to continue."
			placeholder="Choose tier…"
		/>
	</div>
</Story>

<Story name="Disabled">
	<div style="width: 280px;">
		<Select label="Tier" options={TIER_OPTIONS} value="tenant-admin" disabled />
	</div>
</Story>
