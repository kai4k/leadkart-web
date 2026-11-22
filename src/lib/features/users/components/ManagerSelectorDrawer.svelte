<script lang="ts">
	import { z } from 'zod';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { FormSheet, Select } from '#lib/components/form/index.ts';
	import { assignManagerMutation, removeManagerMutation } from '$features/users/queries';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth';
	import { ValidationError } from '$api/errors';

	type Props = {
		userList: UserDto[];
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { userList, open = $bindable(false), user, onOpenChange }: Props = $props();

	const schema = z.object({ manager: z.string() });

	const eligibleManagers = $derived(
		user
			? userList.filter((u) => u.membership_id !== user.membership_id && u.status === 'active')
			: []
	);

	const assignMutation = assignManagerMutation();
	const removeMutation = removeManagerMutation({ inlineErrors: true });
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, assignMutation, removeMutation);

	async function onSubmit(values: z.output<typeof schema>) {
		if (!user) return;
		try {
			if (values.manager) {
				await assignMutation.mutateAsync({ id: user.membership_id, managerId: values.manager });
			} else if (user.reports_to) {
				await removeMutation.mutateAsync(user.membership_id);
			}
		} catch (err) {
			// the Go field is `manager_id` (or `reports_to`): it belongs on the one field this form has
			if (err instanceof ValidationError) {
				const message = err.fields.manager_id ?? err.fields.reports_to;
				if (message) throw new ValidationError({ manager: message }, err.status);
			}
			throw err;
		}
	}
</script>

<FormSheet
	bind:open
	{onOpenChange}
	title={`Manager for ${user ? displayName(user) : 'user'}`}
	description="Used by hierarchy-scoped lists (lead reports, leave approvals) and the org tree."
	submitLabel="Save"
	{schema}
	initial={() => ({ manager: user?.reports_to ?? '' })}
	{onSubmit}
	formId="manager-form"
	errorLines={{
		403: "You don't have permission to change this user's manager.",
		404: 'This user was deleted or moved.',
		409: 'This manager assignment conflicts with an existing one.'
	}}
>
	{#snippet fields(form)}
		<Select
			label="Reports to"
			name="manager"
			bind:value={form.values.manager}
			error={form.errors.manager}
			options={[
				{ value: '', label: '— No manager —' },
				...eligibleManagers.map((m) => ({ value: m.membership_id, label: displayName(m) }))
			]}
		/>
	{/snippet}
</FormSheet>
