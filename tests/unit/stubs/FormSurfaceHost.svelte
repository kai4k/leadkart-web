<script lang="ts">
	import { z } from 'zod';
	import { FormDialog, FormSheet, TextField } from '#lib/components/form/index.ts';

	let {
		surface = 'sheet',
		open = $bindable(true),
		seed = 'Asha',
		onSubmit,
		onOpenChange,
		submitVariant
	}: {
		surface?: 'sheet' | 'dialog';
		open?: boolean;
		seed?: string;
		onSubmit: (values: { name: string }) => Promise<void>;
		onOpenChange: (open: boolean) => void;
		submitVariant?: 'default' | 'destructive';
	} = $props();

	const schema = z.object({ name: z.string().min(1, 'Enter a name.') });
	const Surface = $derived(surface === 'sheet' ? FormSheet : FormDialog);
</script>

<Surface
	bind:open
	{onOpenChange}
	{onSubmit}
	{schema}
	{submitVariant}
	initial={() => ({ name: seed })}
	title="Edit person"
	description="Change the name."
	submitLabel="Save person"
	formId="host-form"
>
	{#snippet fields(form)}
		<TextField label="Name" name="name" bind:value={form.values.name} error={form.errors.name} />
	{/snippet}
</Surface>
