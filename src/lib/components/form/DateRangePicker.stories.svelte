<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { CalendarDate } from '@internationalized/date';
	import DateRangePicker from './DateRangePicker.svelte';

	const { Story } = defineMeta({
		title: 'Form/DateRangePicker',
		component: DateRangePicker,
		tags: ['autodocs']
	});

	const RANGE = {
		start: new CalendarDate(2026, 5, 1),
		end: new CalendarDate(2026, 5, 31)
	};
</script>

<Story name="Default (empty)">
	<div style="width: 320px;">
		<DateRangePicker label="Date range" />
	</div>
</Story>

<Story name="With range">
	<div style="width: 320px;">
		<DateRangePicker label="Reporting period" value={RANGE} />
	</div>
</Story>

<Story name="With hint">
	<div style="width: 320px;">
		<DateRangePicker
			label="Activity window"
			hint="Maximum 90 days. Defaults to the current FY."
			value={RANGE}
		/>
	</div>
</Story>

<Story name="With error">
	<div style="width: 320px;">
		<DateRangePicker label="Activity window" value={RANGE} error="Range cannot exceed 90 days." />
	</div>
</Story>
