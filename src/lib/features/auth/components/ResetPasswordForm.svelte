<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { bannerText, fieldText, readFailure } from '#lib/utils/form-failure.ts';
	import { enhance } from '$app/forms';
	import { withFocusOnFailure } from '#lib/utils/focus-first-invalid.ts';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Icon, Lock } from '#lib/icons/index.ts';
	import { Alert, AuthCard, Button, Logo } from '#lib/components/ui/index.ts';
	import { PasswordField } from '#lib/components/form/index.ts';
	import { resolve } from '$app/paths';
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

	const failure = $derived(readFailure(form));
	const formError = $derived(bannerText(failure, $_));
	const fieldErrors = $derived({
		new_password: fieldText(failure, 'new_password', $_),
		confirm: fieldText(failure, 'confirm', $_)
	});

	$effect(() => {
		if (success) setTimeout(() => goto(resolve('signin')), 2000);
	});
</script>

<AuthCard>
	<div class="flex flex-col items-center gap-6">
		<Logo size="2xl" />
		<div class="stack stack-tight text-center">
			<h1 class="h1 text-primary">{$_('auth.resetPassword.title')}</h1>
			<p class="body-sm text-muted-foreground">{$_('auth.resetPassword.subtitle')}</p>
		</div>
	</div>

	{#if !token}
		<Alert variant="warning">
			<p>{$_('auth.resetPassword.errors.missingToken')}</p>
		</Alert>
		<p class="caption text-muted-foreground text-center">
			<a
				href={resolve('forgot-password')}
				class="text-primary underline underline-offset-2 hover:no-underline"
				>{$_('auth.resetPassword.requestNew')}</a
			>
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
			use:enhance={withFocusOnFailure(() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			})}
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
				<Alert variant="destructive">{formError}</Alert>
			{/if}

			<Button class="w-full" type="submit" {loading} size="lg">
				{loading ? $_('common.loading') : $_('auth.resetPassword.submit')}
			</Button>
		</form>

		<div
			class="border-border text-muted-foreground flex flex-col items-center gap-2 border-t pt-4 sm:flex-row sm:justify-center"
		>
			<Icon icon={Lock} size="xs" />
			<span class="caption">
				{$_('auth.resetPassword.backToSignin')}

				<a
					href={resolve('signin')}
					class="text-primary underline underline-offset-2 hover:no-underline"
					>{$_('auth.signin.title')}</a
				>
			</span>
		</div>
	{/if}
</AuthCard>
