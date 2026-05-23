<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Icon, Lock } from '$lib/icons';
	import { z } from 'zod';
	import { resetPassword } from '../api';
	import { Alert, AuthCard, Button, Logo } from '$lib/components/ui';
	import { PasswordField } from '$lib/components/form';

	/**
	 * ResetPasswordForm — public reset confirmation step (email-link flow).
	 *
	 * Flow:
	 *   1. User clicks the link emailed by Go: /reset-password?token=…
	 *   2. We read the token from the query string.
	 *   3. User enters new_password + confirm.
	 *   4. POST /auth/reset-password { token, new_password } → 204.
	 *   5. Success Alert + 2s setTimeout → /signin.
	 *
	 * Error mapping:
	 *   400 invalid_token / token_consumed / token_expired → top banner
	 *   422 password_breached → field error on new_password
	 *   422 password_same     → field error on new_password
	 *   422 weak_password     → field error on new_password
	 *
	 * Missing/empty token: surface "Reset link invalid — request a new one."
	 */

	const token = $derived(page.url.searchParams.get('token') ?? '');
	const newPasswordSchema = z.string().min(12, $_('auth.resetPassword.newPasswordHint'));

	let newPassword = $state('');
	let confirmPassword = $state('');
	let fieldErrors = $state<{ new_password?: string; confirm?: string }>({});
	let formError = $state<string | null>(null);
	let loading = $state(false);
	let success = $state(false);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		fieldErrors = {};

		if (!token) {
			formError = $_('auth.resetPassword.errors.invalidToken');
			return;
		}
		if (newPassword !== confirmPassword) {
			fieldErrors = { confirm: $_('auth.resetPassword.errors.mismatch') };
			return;
		}
		const parsed = newPasswordSchema.safeParse(newPassword);
		if (!parsed.success) {
			fieldErrors = { new_password: parsed.error.issues[0]?.message };
			return;
		}

		loading = true;
		try {
			await resetPassword({ token, new_password: parsed.data });
			success = true;
			setTimeout(() => goto('/signin'), 2000);
		} catch (err) {
			const status = (err as { status?: number }).status;
			const code = (err as { code?: string }).code;
			if (status === 400) {
				formError = $_('auth.resetPassword.errors.invalidToken');
			} else if (status === 422 && code === 'password_breached') {
				fieldErrors = { new_password: $_('auth.resetPassword.errors.breached') };
			} else if (status === 422 && code === 'password_same') {
				fieldErrors = { new_password: $_('auth.resetPassword.errors.same') };
			} else if (status === 422) {
				fieldErrors = { new_password: $_('auth.resetPassword.errors.weak') };
			} else {
				formError = $_('auth.errors.unexpected');
			}
		} finally {
			loading = false;
		}
	}
</script>

<AuthCard>
	<div class="flex flex-col items-center gap-6">
		<Logo size="2xl" />
		<div class="stack stack-tight text-center">
			<h1 class="h1 text-brand-heading">{$_('auth.resetPassword.title')}</h1>
			<p class="body-sm text-fg-muted">{$_('auth.resetPassword.subtitle')}</p>
		</div>
	</div>

	{#if !token}
		<Alert variant="warning">
			<p>{$_('auth.resetPassword.errors.missingToken')}</p>
		</Alert>
		<p class="caption text-fg-muted text-center">
			<a href="/forgot-password" class="text-primary hover:underline"
				>{$_('auth.resetPassword.requestNew')}</a
			>
		</p>
	{:else if success}
		<Alert variant="success">
			<p>{$_('auth.resetPassword.success')}</p>
		</Alert>
	{:else}
		<form class="stack" onsubmit={onSubmit} novalidate>
			<PasswordField
				label={$_('auth.resetPassword.newPassword')}
				hint={$_('auth.resetPassword.newPasswordHint')}
				autocomplete="new-password"
				required
				bind:value={newPassword}
				error={fieldErrors.new_password}
			/>
			<PasswordField
				label={$_('auth.resetPassword.confirmPassword')}
				autocomplete="new-password"
				required
				bind:value={confirmPassword}
				error={fieldErrors.confirm}
			/>
			{#if formError}
				<Alert variant="danger">{formError}</Alert>
			{/if}
			<Button type="submit" {loading} fullWidth size="lg">
				{loading ? $_('common.loading') : $_('auth.resetPassword.submit')}
			</Button>
		</form>

		<div
			class="border-border text-fg-subtle flex flex-col items-center gap-2 border-t pt-4 sm:flex-row sm:justify-center"
		>
			<Icon icon={Lock} size="xs" />
			<span class="caption"
				>{$_('auth.resetPassword.backToSignin')}
				<a href="/signin" class="text-primary hover:underline">{$_('auth.signin.title')}</a></span
			>
		</div>
	{/if}
</AuthCard>
