<script lang="ts">
	import Select, { type SelectOption } from '#lib/components/form/Select.svelte';

	let {
		options,
		label,
		hint,
		error,
		placeholder
	}: {
		options: SelectOption[];
		label: string;
		hint?: string;
		error?: string | null;
		placeholder?: string;
	} = $props();
	let value = $state('');
</script>

<Select {options} {label} {hint} {error} {placeholder} bind:value />
<output data-testid="bound">{value}</output>
