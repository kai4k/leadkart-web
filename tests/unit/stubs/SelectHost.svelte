<script lang="ts">
	import Select, { type SelectOption } from '#lib/components/form/Select.svelte';

	let {
		options,
		label,
		hint,
		error,
		placeholder,
		initial = '',
		required = false
	}: {
		required?: boolean;
		initial?: string;
		options: SelectOption[];
		label: string;
		hint?: string;
		error?: string | null;
		placeholder?: string;
	} = $props();
	// svelte-ignore state_referenced_locally
	let value = $state(initial);
</script>

<Select {options} {label} {hint} {error} {placeholder} {required} bind:value />
<output data-testid="bound">{value}</output>
