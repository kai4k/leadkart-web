<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { bannerText, fieldText, readFailure } from '#lib/utils/form-failure.ts';
	import { enhance } from '$app/forms';
	import { withFocusOnFailure } from '#lib/utils/focus-first-invalid.ts';
	import { Alert, Button } from '$ui';
	import { PasswordField, ScopeContextField } from '$form';

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
		fieldKeys?: Record<string, string>;
		fieldMessages?: Record<string, string>;
		formErrorKey?: string | null;
		success?: boolean;
	};
	type Props = { form?: FormResult };
	let { form }: Props = $props();

	let loading = $state(false);

	const ours = $derived(form?.which === 'changePassword');
	const success = $derived(Boolean(ours && form?.success));

	const failure = $derived(ours ? readFailure(form) : null);
	const fieldErrors = $derived({
		current: fieldText(failure, 'current', $_),
		new: fieldText(failure, 'new', $_),
		confirm: fieldText(failure, 'confirm', $_)
	});
	const formError = $derived(bannerText(failure, $_));
</script>

<form
	class="stack"
	method="POST"
	action="?/changePassword"
	novalidate
	use:enhance={withFocusOnFailure(() => {
		loading = true;
		return async ({ update }) => {
			await update();
			loading = false;
		};
	})}
>
	<ScopeContextField />

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
		<Alert variant="destructive">{formError}</Alert>
	{/if}
	<!-- The live region is in the page before its content, so the confirmation is announced (a region inserted together with its text often is not). -->
	<div role="status">
		{#if !formError && success}
			<Alert variant="success" role="none">{$_('account.security.changePassword.success')}</Alert>
		{/if}
	</div>

	<div class="form-footer">
		<Button type="submit" {loading}>
			{$_('account.security.changePassword.submit')}
		</Button>
	</div>
</form>
