<script lang="ts">
	import { ActionForm, NumberInput, TextField } from '#lib/components/form/index.ts';
	import type { ActionFormResult } from '#lib/components/form/ActionForm.svelte';

	let { result }: { result?: ActionFormResult | null } = $props();
	let level = $state<number | null>(50);
</script>

<ActionForm id="host" action="?/save" {result} submitLabel="Save" scoped={false}>
	{#snippet children({ fieldError })}
		<TextField label="Name" name="name" value="Asha" error={fieldError('name')} />
		<NumberInput label="Level" name="level" min={1} max={99} bind:value={level} />
	{/snippet}
</ActionForm>
