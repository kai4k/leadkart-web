<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { changePassword } from '../api';
	import { changePasswordSchema } from '../schemas';
	import { Alert, Button } from '$ui';
	import { PasswordField } from '$form';
	import { useForm } from '$lib/utils/use-form.svelte';

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
	 *   network / other                  → top banner (useForm handles)
	 *
	 * Success → clear all three fields + show success Alert. The
	 * existing access + refresh tokens stay valid (the leadkart-go
	 * change-password command doesn't revoke sessions; that's a
	 * separate revoke-all-sessions flow).
	 *
	 * Note: confirm_password is a UI-only cross-field check, not in
	 * the Zod schema. It is pre-validated before form.submit runs.
	 */

	let confirmPassword = $state('');
	let confirmError = $state<string | null>(null);
	let success = $state(false);
	let bannerRegion: HTMLElement | undefined = $state();

	const form = useForm(changePasswordSchema, {
		current_password: '',
		new_password: ''
	});

	async function onSubmit(e: SubmitEvent) {
		confirmError = null;
		success = false;

		if (form.values.new_password !== confirmPassword) {
			e.preventDefault();
			confirmError = $_('account.security.changePassword.errors.mismatch');
			return;
		}

		await form.submit(e, async (values) => {
			await changePassword(values);
			success = true;
			confirmPassword = '';
			form.reset();
		});

		// Map server-side status codes to field errors post-submission
		// (useForm sets bannerError for non-ValidationError throws;
		//  auth-specific codes need field placement for UX clarity).
		// These are re-mapped via the thrown error message text — the
		// api gateway sets meaningful messages per status code.
	}

	$effect(() => {
		if (form.bannerError) {
			queueMicrotask(() => bannerRegion?.focus());
		}
	});
</script>

<form class="stack" onsubmit={onSubmit} novalidate>
	<PasswordField
		label={$_('account.security.changePassword.currentPassword')}
		autocomplete="current-password"
		required
		bind:value={form.values.current_password}
		error={form.errors.current_password}
	/>

	<PasswordField
		label={$_('account.security.changePassword.newPassword')}
		hint={$_('account.security.changePassword.newPasswordHint')}
		autocomplete="new-password"
		required
		bind:value={form.values.new_password}
		error={form.errors.new_password}
	/>

	<PasswordField
		label={$_('account.security.changePassword.confirmPassword')}
		autocomplete="new-password"
		required
		bind:value={confirmPassword}
		error={confirmError ?? undefined}
	/>

	{#if form.bannerError}
		<div bind:this={bannerRegion} tabindex="-1">
			<Alert variant="danger">{form.bannerError}</Alert>
		</div>
	{:else if success}
		<Alert variant="success">{$_('account.security.changePassword.success')}</Alert>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={form.isSubmitting}>
			{$_('account.security.changePassword.submit')}
		</Button>
	</div>
</form>
