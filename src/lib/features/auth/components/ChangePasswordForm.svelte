<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { changePassword } from '../api';
	import { changePasswordSchema } from '../schemas';
	import { isApiError } from '$api/client';
	import { Alert, Button } from '$ui';
	import { PasswordField } from '$form';

	/**
	 * ChangePasswordForm — authenticated password change. The server
	 * verifies the current password even with a valid bearer (per
	 * security.md "Password change") so a stolen access token can't
	 * permanently take over an account.
	 *
	 * Error mapping:
	 *   401 incorrect_current_password   → field error on current
	 *   422 password_breached            → field error on new
	 *   422 password_same_as_current     → field error on new
	 *                                      (server message text
	 *                                       differentiates the two
	 *                                       422 codes)
	 *   network / other                  → top banner
	 *
	 * Success → clear all three fields + show success Alert. The
	 * existing access + refresh tokens stay valid (the leadkart-go
	 * change-password command doesn't revoke sessions; that's a
	 * separate revoke-all-sessions flow).
	 */

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let saving = $state(false);
	let bannerError = $state<string | null>(null);
	let success = $state(false);
	let fieldErrors = $state<{
		current_password?: string;
		new_password?: string;
		confirm_password?: string;
	}>({});
	let bannerRegion: HTMLElement | undefined = $state();

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		bannerError = null;
		fieldErrors = {};
		success = false;

		if (newPassword !== confirmPassword) {
			fieldErrors = { confirm_password: $_('account.security.changePassword.errors.mismatch') };
			return;
		}

		const parsed = changePasswordSchema.safeParse({
			current_password: currentPassword,
			new_password: newPassword
		});
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			fieldErrors = {
				current_password: flat.current_password?.[0],
				new_password: flat.new_password?.[0]
			};
			return;
		}

		saving = true;
		try {
			await changePassword(parsed.data);
			success = true;
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (err) {
			if (isApiError(err)) {
				if (err.status === 401) {
					fieldErrors = {
						current_password: $_('account.security.changePassword.errors.incorrectCurrent')
					};
				} else if (err.status === 422) {
					fieldErrors = {
						new_password: err.message || $_('account.security.changePassword.errors.generic')
					};
				} else {
					bannerError = $_('account.security.changePassword.errors.generic');
				}
			} else {
				bannerError = $_('account.security.changePassword.errors.generic');
			}
			queueMicrotask(() => bannerRegion?.focus());
		} finally {
			saving = false;
		}
	}
</script>

<form class="stack" onsubmit={onSubmit} novalidate>
	<PasswordField
		label={$_('account.security.changePassword.currentPassword')}
		autocomplete="current-password"
		required
		bind:value={currentPassword}
		error={fieldErrors.current_password}
	/>

	<PasswordField
		label={$_('account.security.changePassword.newPassword')}
		hint={$_('account.security.changePassword.newPasswordHint')}
		autocomplete="new-password"
		required
		bind:value={newPassword}
		error={fieldErrors.new_password}
	/>

	<PasswordField
		label={$_('account.security.changePassword.confirmPassword')}
		autocomplete="new-password"
		required
		bind:value={confirmPassword}
		error={fieldErrors.confirm_password}
	/>

	{#if bannerError}
		<div bind:this={bannerRegion} tabindex="-1">
			<Alert variant="danger">{bannerError}</Alert>
		</div>
	{:else if success}
		<Alert variant="success">{$_('account.security.changePassword.success')}</Alert>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={saving}>
			{$_('account.security.changePassword.submit')}
		</Button>
	</div>
</form>
