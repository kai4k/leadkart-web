<script lang="ts">
	import { z } from 'zod';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { FormSheet, TagInput } from '#lib/components/form/index.ts';
	import { replacePermissionOverridesMutation } from '$features/users/queries';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth';
	import { ValidationError } from '$api/errors';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	const schema = z.object({ granted: z.array(z.string()), revoked: z.array(z.string()) });

	const mutation = replacePermissionOverridesMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);

	async function onSubmit(values: z.output<typeof schema>) {
		if (!user) return;
		try {
			await mutation.mutateAsync({ id: user.membership_id, body: values });
		} catch (err) {
			// a refusal with no field named: one line for the whole set
			if (err instanceof ValidationError && !err.fields.granted && !err.fields.revoked)
				throw new ValidationError({ granted: 'form.errors.permissionNamesInvalid' }, err.status);
			throw err;
		}
	}
</script>

<FormSheet
	bind:open
	{onOpenChange}
	title={`Permission overrides for ${user ? displayName(user) : 'user'}`}
	description="Atomic replace: this exact set of grants and revokes overlays on top of role-default permissions. Empty lists clear the overlay."
	submitLabel="Apply overrides"
	{schema}
	{onSubmit}
	initial={() => ({ granted: [], revoked: [] })}
	formId="permission-overrides-form"
	errorLines={{
		403: "You don't have permission to manage permission overrides.",
		404: 'This user was deleted or moved.',
		409: 'These overrides conflict with the current role set.'
	}}
>
	{#snippet fields(form)}
		<!-- V1: no endpoint returns a user's existing overrides, so they are managed blind: grant-only-on-save. -->
		<TagInput
			label="Extra grants"
			name="granted"
			placeholder="e.g. crm.leads.reassign"
			bind:value={form.values.granted}
			error={form.errors.granted}
		/>
		<TagInput
			label="Revocations"
			name="revoked"
			placeholder="e.g. crm.leads.delete"
			bind:value={form.values.revoked}
			error={form.errors.revoked}
		/>
	{/snippet}
</FormSheet>
