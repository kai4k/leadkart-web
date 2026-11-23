<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { passwordPolicyHint } from '#lib/features/auth/password-policy.ts';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Alert, AuthCard } from '#lib/components/ui/index.ts';
	import { ActionForm, PasswordField } from '#lib/components/form/index.ts';
	import type { ActionData } from '../../../../routes/(auth)/reset-password/$types';

	/**
	 * ResetPasswordForm: the action lives at (auth)/reset-password/+page.server.ts. The token comes from the URL
	 * (`?token=`); without one the card says the link is invalid and offers a new one.
	 *
	 * A link that can no longer be used (expired, used, unknown, or refused too often: the API answers them all
	 * `reset_token_invalid`, and the action names them with one key) cannot be retried: the form gives way to the
	 * sentence and the way to a new link, which takes the focus.
	 */
	type Props = { form?: ActionData };
	let { form }: Props = $props();

	const SPENT_KEY = 'auth.resetPassword.errors.invalidToken';

	const token = $derived(page.url.searchParams.get('token') ?? '');
	const success = $derived(Boolean(form && 'success' in form && form.success));
	const spent = $derived(
		Boolean(form && 'formErrorKey' in form && form.formErrorKey === SPENT_KEY)
	);

	$effect(() => {
		if (success) setTimeout(() => goto(resolve('signin')), 2000);
	});

	// The form (and the button that had the focus) is gone: the one thing left to do gets it.
	let requestNew: HTMLAnchorElement | undefined = $state();
	$effect(() => {
		if (spent) requestNew?.focus();
	});
</script>

<AuthCard title={$_('auth.resetPassword.title')} subtitle={$_('auth.resetPassword.subtitle')}>
	{#if !token}
		<Alert variant="warning">
			<p>{$_('auth.resetPassword.errors.missingToken')}</p>
		</Alert>
	{:else if success}
		<Alert variant="success">
			<p>{$_('auth.resetPassword.success')}</p>
		</Alert>
	{:else if spent}
		<Alert variant="warning">
			<p>{$_(SPENT_KEY)}</p>
		</Alert>
	{:else}
		<ActionForm
			id="reset-password-form"
			result={form}
			scoped={false}
			wide
			submitLabel={$_('auth.resetPassword.submit')}
		>
			{#snippet children({ fieldError })}
				<PasswordField
					label={$_('auth.resetPassword.newPassword')}
					name="new_password"
					hint={passwordPolicyHint(null, $_)}
					autocomplete="new-password"
					required
					error={fieldError('new_password')}
				/>
				<PasswordField
					label={$_('auth.resetPassword.confirmPassword')}
					name="confirm"
					autocomplete="new-password"
					required
					error={fieldError('confirm')}
				/>
			{/snippet}
		</ActionForm>
	{/if}
	{#snippet footer()}
		{#if !token || spent}
			<a
				bind:this={requestNew}
				href={resolve('forgot-password')}
				class="text-primary-text underline underline-offset-2 hover:no-underline"
				>{$_('auth.resetPassword.requestNew')}</a
			>
		{:else if !success}
			{$_('auth.resetPassword.backToSignin')}
			<a
				href={resolve('signin')}
				class="text-primary-text underline underline-offset-2 hover:no-underline"
				>{$_('auth.signin.title')}</a
			>
		{/if}
	{/snippet}
</AuthCard>
