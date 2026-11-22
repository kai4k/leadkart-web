<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ActionForm, PasswordField, type ActionFormResult } from '$form';

	/**
	 * ChangePasswordForm: authenticated password change via the form action `?/changePassword`. The server verifies
	 * the current password (a stolen access token cannot permanently take over an account). The page's `form` also
	 * carries the email form's result, told apart by `which`. Nothing typed stays on screen after a save.
	 */
	type FormResult = ActionFormResult & { which?: 'changePassword' | 'changeEmail' };
	type Props = { form?: FormResult };
	let { form }: Props = $props();

	const ours = $derived(form?.which === 'changePassword' ? form : null);
</script>

<ActionForm
	id="change-password-form"
	action="?/changePassword"
	result={ours}
	successMessage={$_('account.security.changePassword.success')}
	submitLabel={$_('account.security.changePassword.submit')}
	resetOnSuccess
>
	{#snippet children({ fieldError })}
		<PasswordField
			label={$_('account.security.changePassword.currentPassword')}
			name="current_password"
			autocomplete="current-password"
			required
			error={fieldError('current')}
		/>
		<PasswordField
			label={$_('account.security.changePassword.newPassword')}
			name="new_password"
			hint={$_('account.security.changePassword.newPasswordHint')}
			autocomplete="new-password"
			required
			error={fieldError('new')}
		/>
		<PasswordField
			label={$_('account.security.changePassword.confirmPassword')}
			name="confirm_password"
			autocomplete="new-password"
			required
			error={fieldError('confirm')}
		/>
	{/snippet}
</ActionForm>
