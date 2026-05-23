<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Icon, Lock } from '$lib/icons';
	import { z } from 'zod';
	import { requestPasswordReset } from '../api';
	import { Alert, AuthCard, Button, Logo } from '$lib/components/ui';
	import { TextField } from '$lib/components/form';

	/**
	 * ForgotPasswordForm — public email-input step.
	 *
	 * Flow:
	 *   email → POST /auth/request-password-reset → 204 (always, regardless
	 *   of whether the email is registered — Auth0/Okta canon per backend
	 *   ADR; defeats account enumeration).
	 *
	 * UX: success copy is identical for "email exists" and "email doesn't
	 * exist" — we cannot distinguish, and showing a different message would
	 * leak existence. "If that email is registered, we've sent a link."
	 */

	const emailSchema = z.string().min(1, 'Email is required').email('Invalid email format');

	let email = $state('');
	let fieldError = $state<string | null>(null);
	let formError = $state<string | null>(null);
	let loading = $state(false);
	let submitted = $state(false);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		fieldError = null;
		formError = null;

		const parsed = emailSchema.safeParse(email);
		if (!parsed.success) {
			fieldError = parsed.error.issues[0]?.message ?? 'Invalid email';
			return;
		}

		loading = true;
		try {
			await requestPasswordReset({ email: parsed.data });
			submitted = true;
		} catch (err) {
			formError = (err as Error).message ?? $_('auth.errors.unexpected');
		} finally {
			loading = false;
		}
	}
</script>

<AuthCard>
	<div class="flex flex-col items-center gap-6">
		<Logo size="2xl" />
		<div class="stack stack-tight text-center">
			<h1 class="h1 text-brand-heading">{$_('auth.forgotPassword.title')}</h1>
			<p class="body-sm text-fg-muted">{$_('auth.forgotPassword.subtitle')}</p>
		</div>
	</div>

	{#if submitted}
		<Alert variant="success">
			<p>{$_('auth.forgotPassword.successCopy')}</p>
		</Alert>
		<p class="caption text-fg-muted text-center">
			<a href="/signin" class="text-primary hover:underline"
				>{$_('auth.forgotPassword.backToSignin')}</a
			>
		</p>
	{:else}
		<form class="stack" onsubmit={onSubmit} novalidate>
			<TextField
				label={$_('auth.forgotPassword.email')}
				type="email"
				autocomplete="username"
				required
				bind:value={email}
				error={fieldError ?? undefined}
			/>
			{#if formError}
				<Alert variant="danger">{formError}</Alert>
			{/if}
			<Button type="submit" {loading} fullWidth size="lg">
				{loading ? $_('common.loading') : $_('auth.forgotPassword.submit')}
			</Button>
		</form>

		<div
			class="border-border text-fg-subtle flex flex-col items-center gap-2 border-t pt-4 sm:flex-row sm:justify-center"
		>
			<Icon icon={Lock} size="xs" />
			<span class="caption"
				>{$_('auth.forgotPassword.knowIt')}
				<a href="/signin" class="text-primary hover:underline">{$_('auth.signin.title')}</a></span
			>
		</div>
	{/if}
</AuthCard>
