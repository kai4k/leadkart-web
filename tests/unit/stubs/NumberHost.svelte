<script lang="ts">
	import NumberInput from '#lib/components/form/NumberInput.svelte';

	let {
		initial = null,
		...rest
	}: { initial?: number | null; label: string; [key: string]: unknown } = $props();
	// svelte-ignore state_referenced_locally
	let value = $state<number | null>(initial);
</script>

<form>
	<NumberInput {...rest as { label: string }} bind:value />
</form>
<output data-testid="bound">{value === null ? 'null' : String(value)}</output>
