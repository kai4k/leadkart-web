<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Icon, Lock } from '$lib/icons';
	import { Alert, AuthCard, Button, Logo } from '$lib/components/ui';
	import { PasswordField } from '$lib/components/form';
	import type { ActionData } from '../../../../routes/(auth)/reset-password/$types';

	/**
	 * ResetPasswordForm — Svelte canon form-shaped route. Action lives
	 * at (auth)/reset-password/+page.server.ts.
	 *
	 * Token from URL (?token=...). Missing token surfaces a "Reset link
	 * invalid" notice with a link to /forgot-password.
	 */
	type Props = { form?: ActionData };
	let { form }: Props = $props();

	const token = $derived(page.url.searchParams.get('token') ?? '');

	let loading = $state(false);
	const success = $derived(Boolean(form && 'success' in form && form.success));

	const formErrorKey = $derived(
		form && 'formErrorKey' in form && form.formErrorKey ? form.formErrorKey : null
	);
	const formError = $derived(formErrorKey ? $_(formErrorKey) : null);

	const fieldKeys = $derived<{ new_password?: string; confirm?: string }>(
		form && 'fieldKeys' in form && form.fieldKeys ? form.fieldKeys : {}
	);
	const fieldErrors = $derived({
		new_password: fieldKeys.new_password ? $_(fieldKeys.new_password) : undefined,
		confirm: fieldKeys.confirm ? $_(fieldKeys.confirm) : undefined
	});

	$effect(() => {
		if (success) setTimeout(() => goto('/signin'), 2000);
	});
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
			<a href="/forgot-password" class="text-primary hover:underline">
				{$_('auth.resetPassword.requestNew')}
			</a>
		</p>
	{:else if success}
		<Alert variant="success">
			<p>{$_('auth.resetPassword.success')}</p>
		</Alert>
	{:else}
		<form
			class="stack"
			method="POST"
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
				label={$_('auth.resetPassword.newPassword')}
				name="new_password"
				hint={$_('auth.resetPassword.newPasswordHint')}
				autocomplete="new-password"
				required
				error={fieldErrors.new_password}
			/>
			<PasswordField
				label={$_('auth.resetPassword.confirmPassword')}
				name="confirm"
				autocomplete="new-password"
				required
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
			<span class="caption">
				{$_('auth.resetPassword.backToSignin')}
				<a href="/signin" class="text-primary hover:underline">{$_('auth.signin.title')}</a>
			</span>
		</div>
	{/if}
</AuthCard>
