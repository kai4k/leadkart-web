<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { CalendarDate } from '@internationalized/date';
	import DatePicker from './DatePicker.svelte';

	const { Story } = defineMeta({
		title: 'Form/DatePicker',
		component: DatePicker,
		tags: ['autodocs']
	});

	const TODAY = new CalendarDate(2026, 5, 26);
	const FUTURE = new CalendarDate(2026, 12, 31);
</script>

<Story name="Default (empty)">
	<div style="width: 280px;">
		<DatePicker label="Expiry date" />
	</div>
</Story>

<Story name="With value">
	<div style="width: 280px;">
		<DatePicker label="Expiry date" value={TODAY} />
	</div>
</Story>

<Story name="With hint">
	<div style="width: 280px;">
		<DatePicker
			label="Batch expiry"
			hint="FEFO ordering — earliest expiry ships first."
			value={FUTURE}
		/>
	</div>
</Story>

<Story name="With error">
	<div style="width: 280px;">
		<DatePicker
			label="Batch expiry"
			value={TODAY}
			error="Expiry must be at least 6 months from today."
		/>
	</div>
</Story>

<Story name="Disabled">
	<div style="width: 280px;">
		<DatePicker label="Created on" value={TODAY} disabled />
	</div>
</Story>
