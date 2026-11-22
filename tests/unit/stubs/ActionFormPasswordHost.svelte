<script lang="ts">
	import { ActionForm, PasswordField, TextField } from '#lib/components/form/index.ts';

	let {
		allowed = true,
		resetOnSuccess = false,
		guardLeave = false
	}: { allowed?: boolean; resetOnSuccess?: boolean; guardLeave?: boolean } = $props();
</script>

<ActionForm
	id="pw"
	action="?/save"
	result={null}
	submitLabel="Save"
	{allowed}
	disallowedReason="No access."
	{resetOnSuccess}
	{guardLeave}
	scoped={false}
>
	<PasswordField label="Current" name="current_password" autocomplete="current-password" />
	<PasswordField label="New" name="new_password" autocomplete="new-password" />
	<TextField label="Name" name="name" value="Asha" />
</ActionForm>
