<script lang="ts">
	import DatePicker from '#lib/components/form/DatePicker.svelte';

	let valueString = $state<string | undefined>(undefined);
	let next = $state('2025-08-07');
</script>

<DatePicker label="When" name="when" bind:valueString />
<button
	type="button"
	data-testid="set"
	onclick={(e) => (valueString = e.currentTarget.dataset.to ?? next)}>set</button
>
<button type="button" data-testid="reset" onclick={() => (valueString = '')}>reset</button>
