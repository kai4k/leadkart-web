<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { enhance } from '$app/forms';
	import { Alert, Button } from '$ui';
	import { PasswordField } from '$form';

	/**
	 * ChangePasswordForm — authenticated password change via SvelteKit
	 * form action `?/changePassword`. Server verifies current_password
	 * per security.md "Password change" so a stolen access token can't
	 * permanently take over an account.
	 *
	 * Receives `form` (action result) from the page; renders
	 * field-level + form-level errors localised via $_().
	 */
	type FormResult = {
		which?: 'changePassword' | 'changeEmail';
		fieldKeys?: { current?: string; new?: string; confirm?: string };
		formErrorKey?: string;
		success?: boolean;
	};
	type Props = { form?: FormResult };
	let { form }: Props = $props();

	let loading = $state(false);

	const ours = $derived(form?.which === 'changePassword');
	const success = $derived(Boolean(ours && form?.success));

	const fieldKeys = $derived<{ current?: string; new?: string; confirm?: string }>(
		ours && form?.fieldKeys ? form.fieldKeys : {}
	);
	const fieldErrors = $derived({
		current: fieldKeys.current ? $_(fieldKeys.current) : undefined,
		new: fieldKeys.new ? $_(fieldKeys.new) : undefined,
		confirm: fieldKeys.confirm ? $_(fieldKeys.confirm) : undefined
	});

	const formErrorKey = $derived(ours && form?.formErrorKey ? form.formErrorKey : null);
	const formError = $derived(formErrorKey ? $_(formErrorKey) : null);
</script>

<form
	class="stack"
	method="POST"
	action="?/changePassword"
	novalidate
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			await update();
			loading = false;
		};
	}}
>
	<PasswordField
		label={$_('account.security.changePassword.currentPassword')}
		name="current_password"
		autocomplete="current-password"
		required
		error={fieldErrors.current}
	/>

	<PasswordField
		label={$_('account.security.changePassword.newPassword')}
		name="new_password"
		hint={$_('account.security.changePassword.newPasswordHint')}
		autocomplete="new-password"
		required
		error={fieldErrors.new}
	/>

	<PasswordField
		label={$_('account.security.changePassword.confirmPassword')}
		name="confirm_password"
		autocomplete="new-password"
		required
		error={fieldErrors.confirm}
	/>

	{#if formError}
		<Alert variant="danger">{formError}</Alert>
	{:else if success}
		<Alert variant="success">{$_('account.security.changePassword.success')}</Alert>
	{/if}

	<div class="form-footer">
		<Button type="submit" {loading}>
			{$_('account.security.changePassword.submit')}
		</Button>
	</div>
</form>
