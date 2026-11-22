<script lang="ts">
	import { parseDate, type DateValue } from '@internationalized/date';
	import DatePicker from '#lib/components/form/DatePicker.svelte';

	let {
		min = undefined,
		max = undefined,
		minYear = undefined,
		maxYear = undefined,
		dir = 'ltr',
		onSubmit,
		onValueString
	}: {
		min?: string;
		max?: string;
		minYear?: number;
		maxYear?: number;
		dir?: 'ltr' | 'rtl';
		onSubmit?: () => void;
		onValueString?: (v: string | undefined) => void;
	} = $props();

	let valueString = $state<string | undefined>(undefined);
	let picker: { clear(): void } | undefined = $state();
	const minValue = $derived<DateValue | undefined>(min ? parseDate(min) : undefined);
	const maxValue = $derived<DateValue | undefined>(max ? parseDate(max) : undefined);
</script>

<form {dir} onsubmit={(e) => (e.preventDefault(), onSubmit?.())}>
	<DatePicker
		bind:this={picker}
		label="When"
		name="when"
		bind:valueString
		{minValue}
		{maxValue}
		{minYear}
		{maxYear}
		onValueStringChange={(v) => onValueString?.(v)}
	/>
	<button type="reset" data-testid="native-reset">reset</button>
	<button type="button" data-testid="clear" onclick={() => picker?.clear()}>clear</button>
</form>
