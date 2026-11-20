<script lang="ts">
	import TagInput from '#lib/components/form/TagInput.svelte';

	let {
		label,
		initial = [],
		placeholder,
		hint,
		error,
		validate = false
	}: {
		label: string;
		initial?: string[];
		placeholder?: string;
		hint?: string;
		error?: string | null;
		validate?: boolean;
	} = $props();

	let value = $state<string[]>([]);
	// svelte-ignore state_referenced_locally
	value = [...initial];
</script>

<TagInput
	{label}
	{placeholder}
	{hint}
	{error}
	bind:value
	validateTag={validate ? (t) => (t.includes(' ') ? 'No spaces' : null) : undefined}
/>
<output data-testid="tags">{value.join(',')}</output>
