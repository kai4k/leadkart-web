<script lang="ts">
	import { ActionForm, TextField } from '#lib/components/form/index.ts';
	import type { ActionFormResult } from '#lib/components/form/ActionForm.svelte';
	import type { ActionResult } from '$app/forms';

	let {
		result,
		allowed = true,
		disallowedReason,
		guardLeave = false,
		scoped = true,
		onResult
	}: {
		result?: ActionFormResult | null;
		allowed?: boolean;
		disallowedReason?: string;
		guardLeave?: boolean;
		scoped?: boolean;
		onResult?: (r: ActionResult) => void;
	} = $props();
</script>

<ActionForm
	id="host"
	action="?/save"
	{result}
	submitLabel="Save changes"
	successMessage="Saved."
	{allowed}
	{disallowedReason}
	{guardLeave}
	{scoped}
	{onResult}
>
	{#snippet children({ submitting, fieldError, value })}
		<TextField
			label="Name"
			name="name"
			value={String(value('name') ?? 'Asha')}
			error={fieldError('name')}
		/>
		<p data-testid="submitting">{submitting}</p>
	{/snippet}
</ActionForm>
