<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ActionForm, PasswordField, type ActionFormResult } from '$form';
	import { session } from '../stores/session.svelte';
	import { passwordPolicyHint } from '#lib/features/auth/password-policy.ts';

	/**
	 * ChangePasswordForm: authenticated password change via the form action `?/changePassword`. The server verifies
	 * the current password (a stolen access token cannot permanently take over an account). The page's `form` also
	 * carries the email form's result, told apart by `which`. Nothing typed stays on screen after a save.
	 */
	type FormResult = ActionFormResult & { which?: 'changePassword' | 'changeEmail' };
	type Props = { form?: FormResult };
	let { form }: Props = $props();

	// the policy of the company this person belongs to, as the server provides it
	const hint = $derived(passwordPolicyHint(session.capabilities?.password_policy, $_));
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
			hint={`${hint} ${$_('account.security.changePassword.differs')}`}
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
