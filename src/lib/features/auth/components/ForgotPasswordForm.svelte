<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { enhance } from '$app/forms';
	import { Icon, Lock } from '$lib/icons';
	import { Alert, AuthCard, Button, Logo } from '$lib/components/ui';
	import { TextField } from '$lib/components/form';
	import type { ActionData } from '../../../../routes/(auth)/forgot-password/$types';

	/**
	 * ForgotPasswordForm — Svelte canon form-shaped route. Action lives
	 * at (auth)/forgot-password/+page.server.ts.
	 *
	 * UX: success copy is identical for "email exists" and "email doesn't
	 * exist" (Auth0/Okta canon — defeats account enumeration).
	 */

	type Props = { form?: ActionData };
	let { form }: Props = $props();

	let loading = $state(false);

	const submitted = $derived(Boolean(form && 'submitted' in form && form.submitted));
	const fieldError = $derived(
		form && 'fieldError' in form && form.fieldError ? form.fieldError : null
	);
	const formErrorKey = $derived(
		form && 'formError' in form && form.formError ? form.formError : null
	);
	const formError = $derived(formErrorKey ? $_(formErrorKey) : null);
	const initialEmail = $derived(form && 'email' in form ? form.email : '');
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
			<a href="/signin" class="text-primary hover:underline">
				{$_('auth.forgotPassword.backToSignin')}
			</a>
		</p>
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
			<TextField
				label={$_('auth.forgotPassword.email')}
				name="email"
				type="email"
				autocomplete="username"
				required
				value={initialEmail}
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
			<span class="caption">
				{$_('auth.forgotPassword.knowIt')}
				<a href="/signin" class="text-primary hover:underline">{$_('auth.signin.title')}</a>
			</span>
		</div>
	{/if}
</AuthCard>
