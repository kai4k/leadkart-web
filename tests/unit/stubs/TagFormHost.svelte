<script lang="ts">
	import TagInput from '#lib/components/form/TagInput.svelte';

	let {
		initial = [],
		onsubmitted,
		...rest
	}: {
		initial?: string[];
		onsubmitted?: (tags: string[]) => void;
		label: string;
		[key: string]: unknown;
	} = $props();
	// svelte-ignore state_referenced_locally
	let value = $state<string[]>([...initial]);
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		onsubmitted?.([...value]);
	}}
>
	<TagInput {...rest as { label: string }} bind:value />
	<button type="submit">Save</button>
</form>
<output data-testid="tags">{value.join(',')}</output>
