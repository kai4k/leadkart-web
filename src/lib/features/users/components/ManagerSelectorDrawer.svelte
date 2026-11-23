<script lang="ts">
	import { z } from 'zod';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { FormSheet, Select } from '#lib/components/form/index.ts';
	import { assignManagerMutation, removeManagerMutation } from '$features/users/queries';
	import type { RoleDto, UserDto } from '$features/users/types';
	import { eligibleManagers } from '$features/users/view-models';
	import { displayName } from '$features/auth';
	import { ValidationError } from '$api/errors';

	type Props = {
		userList: UserDto[];
		/** The tenant's roles: a member's seniority is the most senior level among theirs. */
		roleList: ReadonlyArray<RoleDto>;
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { userList, roleList, open = $bindable(false), user, onOpenChange }: Props = $props();

	const schema = z.object({ manager: z.string() });

	// Only the members Go would accept (active, strictly more senior).
	const candidates = $derived(user ? eligibleManagers(user, userList, roleList) : []);
	// The manager on record stays in the list when Go would no longer accept them (they left, or are no longer more
	// senior): the field shows who it is instead of going blank, and leaving it as it is changes nothing.
	const current = $derived.by(() => {
		const id = user?.reports_to;
		if (!id || candidates.some((m) => m.membership_id === id)) return null;
		const known = userList.find((m) => m.membership_id === id);
		return {
			value: id,
			label: known
				? `${displayName(known)} (current, can no longer be assigned)`
				: 'Current manager (no longer an active member)'
		};
	});

	const assignMutation = assignManagerMutation();
	const removeMutation = removeManagerMutation({ inlineErrors: true });
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, assignMutation, removeMutation);

	async function onSubmit(values: z.output<typeof schema>) {
		if (!user) return;
		// unchanged: nothing to send (re-sending a departed manager's id is a refusal from Go)
		if (values.manager === (user.reports_to ?? '')) return;
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
				...(current ? [current] : []),
				...candidates.map((m) => ({ value: m.membership_id, label: displayName(m) }))
			]}
		/>
	{/snippet}
</FormSheet>
