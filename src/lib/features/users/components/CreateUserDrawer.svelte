<!-- src/lib/features/users/components/CreateUserDrawer.svelte -->
<script lang="ts">
	import type { z } from 'zod';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { Alert, Button } from '$ui';
	import { FormSheet, TextField, PasswordField } from '#lib/components/form/index.ts';
	import { createUserMutation } from '$features/users/queries';
	import { createUserRequestSchema } from '$features/users/schemas';

	type Props = {
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), onOpenChange }: Props = $props();

	/** Held by the form surface: dropped on close, on open, and when stale. */
	type Added = { membershipId: string; personExisted: boolean };

	const mutation = createUserMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);

	async function onSubmit(values: z.output<typeof createUserRequestSchema>): Promise<Added> {
		const resp = await mutation.mutateAsync(values);
		return { membershipId: resp.membership_id, personExisted: resp.person_existed };
	}
</script>

<FormSheet
	bind:open
	{onOpenChange}
	title="Add team member"
	description="Sends a sign-in to the email below. Roles can be assigned after creation."
	submitLabel="Create user"
	schema={createUserRequestSchema}
	initial={() => ({ email: '', password: '', first_name: '', last_name: '' })}
	{onSubmit}
	closeOnSuccess={false}
	{done}
	formId="create-user-form"
	validateOn="blur"
>
	{#snippet fields(form)}
		<TextField
			label="Email"
			name="email"
			type="email"
			bind:value={form.values.email}
			required
			error={form.errors.email}
		/>
		<TextField
			label="First name"
			name="first_name"
			bind:value={form.values.first_name}
			required
			maxlength={120}
			error={form.errors.first_name}
		/>
		<TextField
			label="Last name"
			name="last_name"
			bind:value={form.values.last_name}
			required
			maxlength={120}
			error={form.errors.last_name}
		/>
		<PasswordField
			label="Initial password"
			name="password"
			autocomplete="new-password"
			bind:value={form.values.password}
			required
			error={form.errors.password}
		/>
		<p class="caption text-subtle-foreground">
			The user will be prompted to change this on first sign-in.
		</p>
	{/snippet}
</FormSheet>

{#snippet done(success: Added, { again }: { again: () => void })}
	{#if success}
		<Alert variant="success">
			Member added. {success.personExisted
				? 'This email already had a LeadKart identity; we attached a new tenant membership to it.'
				: 'A new identity was created.'}
		</Alert>
		<div class="cluster mt-4">
			<Button variant="ghost" onclick={again}>Add another</Button>
			<Button onclick={() => onOpenChange(false)}>Done</Button>
		</div>
	{/if}
{/snippet}
