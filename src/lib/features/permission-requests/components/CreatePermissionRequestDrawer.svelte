<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { FormSheet, NumberInput, TextareaField, TextField } from '#lib/components/form/index.ts';
	import { createPermissionRequestMutation } from '$features/permission-requests/queries';
	import {
		createPermissionRequestSchema,
		PERMISSION_REQUEST_MAX_DAYS
	} from '$features/permission-requests/schemas';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = createPermissionRequestMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);
</script>

<FormSheet
	bind:open
	{onOpenChange}
	title="Request permission"
	description="Time-bound elevation. Routes to your manager (or a Platform operator if you have none)."
	submitLabel="Submit request"
	schema={createPermissionRequestSchema}
	initial={() => ({ permission: '', duration_days: 30, reason: '' })}
	onSubmit={async (values) => void (await mutation.mutateAsync(values))}
	formId="create-permission-request-form"
	validateOn="blur"
>
	{#snippet fields(form)}
		<TextField
			label="Permission"
			name="permission"
			placeholder="e.g. identity.users.create"
			bind:value={form.values.permission}
			required
			error={form.errors.permission}
		/>
		<NumberInput
			label="Duration (days)"
			name="duration_days"
			min={1}
			max={PERMISSION_REQUEST_MAX_DAYS}
			hint="Leave blank for the tenant default."
			bind:value={
				() => form.values.duration_days ?? null, (v) => (form.values.duration_days = v ?? undefined)
			}
			error={form.errors.duration_days}
		/>
		<TextareaField
			label="Reason"
			name="reason"
			rows={4}
			maxlength={1024}
			required
			bind:value={form.values.reason}
			error={form.errors.reason}
		/>
	{/snippet}
</FormSheet>
