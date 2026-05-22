<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { Lock } from 'lucide-svelte';
	import { resetWithOldPassword } from '../api';
	import { resetWithOldPasswordSchema } from '../schemas';
	import { Alert, AuthCard, Button, Logo } from '$lib/components/ui';
	import { TextField, PasswordField } from '$lib/components/form';

	/**
	 * ResetPasswordForm — public self-serve recovery.
	 *
	 * Flow:
	 *   email + old password + new password + confirm new password
	 *   → POST /v1/auth/reset-with-old-password
	 *   → 204 → success Alert + redirect to /signin after 2s
	 *
	 * Why old-password instead of email-link reset (canonical alternative):
	 * v0.5 doesn't ship transactional email yet. The old-password path
	 * lets users self-serve from /signin without that dependency. When
	 * the email service ships, an email-link flow can be added alongside
	 * (or replace this) — same form module, different submit.
	 *
	 * Error mapping (server message text discriminates 422 codes):
	 *   401 invalid_credentials  → top banner ("email or old password incorrect")
	 *   422 password_breached    → field error on new_password
	 *   422 password_same        → field error on new_password
	 *   429 rate_limited         → top banner with throttle notice
	 *   network / other          → top banner (useForm-style)
	 *
	 * confirm_password is a UI-only cross-field check, not in the Zod
	 * schema. Pre-validated before the submit goes out.
	 */

	let email = $state('');
	let oldPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let fieldErrors = $state<{
		email?: string;
		old_password?: string;
		new_password?: string;
		confirm?: string;
	}>({});
	let formError = $state<string | null>(null);
	let loading = $state(false);
	let success = $state(false);
	let errorRegion: HTMLElement | undefined = $state();

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		fieldErrors = {};

		// Cross-field check first (not in Zod schema)
		if (newPassword !== confirmPassword) {
			fieldErrors = { confirm: $_('auth.resetPassword.errors.mismatch') };
			return;
		}

		const parsed = resetWithOldPasswordSchema.safeParse({
			email,
			old_password: oldPassword,
			new_password: newPassword
		});
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			fieldErrors = {
				email: flat.email?.[0],
				old_password: flat.old_password?.[0],
				new_password: flat.new_password?.[0]
			};
			return;
		}

		loading = true;
		try {
			await resetWithOldPassword(parsed.data);
			success = true;
			// Redirect to /signin after a moment so the user can see the
			// confirmation. Refresh-token rotation is server-side; the
			// user re-authenticates fresh on /signin.
			setTimeout(() => goto('/signin'), 2000);
		} catch (err) {
			const status = (err as { status?: number }).status;
			const code = (err as { code?: string }).code;
			if (status === 401) {
				formError = $_('auth.resetPassword.errors.invalidCredentials');
			} else if (status === 422 && code === 'password_breached') {
				fieldErrors = { new_password: $_('auth.resetPassword.errors.breached') };
			} else if (status === 422 && code === 'password_same') {
				fieldErrors = { new_password: $_('auth.resetPassword.errors.same') };
			} else if (status === 429) {
				formError = $_('auth.resetPassword.errors.rateLimited');
			} else {
				formError = $_('auth.errors.unexpected');
			}
			queueMicrotask(() => errorRegion?.focus());
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

	{#if success}
		<Alert variant="success">
			<p>{$_('auth.resetPassword.success')}</p>
		</Alert>
	{:else}
		<form class="stack" onsubmit={onSubmit} novalidate>
			<TextField
				label={$_('auth.resetPassword.email')}
				type="email"
				autocomplete="username"
				required
				bind:value={email}
				error={fieldErrors.email}
			/>

			<PasswordField
				label={$_('auth.resetPassword.oldPassword')}
				autocomplete="current-password"
				required
				bind:value={oldPassword}
				error={fieldErrors.old_password}
			/>

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
				<div bind:this={errorRegion} tabindex="-1">
					<Alert variant="danger">{formError}</Alert>
				</div>
			{/if}

			<Button type="submit" {loading} fullWidth size="lg">
				{loading ? $_('common.loading') : $_('auth.resetPassword.submit')}
			</Button>
		</form>
	{/if}

	<div
		class="border-border text-fg-subtle flex flex-col items-center gap-2 border-t pt-4 sm:flex-row sm:justify-center"
	>
		<Lock size={14} aria-hidden="true" />
		<span class="caption"
			>{$_('auth.resetPassword.backToSignin')}
			<a href="/signin" class="text-primary hover:underline">{$_('auth.signin.title')}</a></span
		>
	</div>
</AuthCard>
