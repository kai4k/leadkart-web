<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { bannerText, fieldText, readFailure } from '#lib/utils/form-failure.ts';
	import { enhance } from '$app/forms';
	import { withFocusOnFailure } from '#lib/utils/focus-first-invalid.ts';
	import { Icon, Lock } from '#lib/icons/index.ts';
	import { Alert, AuthCard, Button } from '#lib/components/ui/index.ts';
	import { TextField } from '#lib/components/form/index.ts';
	import { resolve } from '$app/paths';
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
	const failure = $derived(readFailure<{ email?: string }>(form));
	const fieldError = $derived(fieldText(failure, 'email', $_) ?? null);
	const formError = $derived(bannerText(failure, $_));
	const initialEmail = $derived(failure?.values.email ?? '');
</script>

<AuthCard>
	<div class="flex flex-col items-center gap-6">
		<div class="stack stack-tight text-center">
			<h1 class="h1 text-primary-text">{$_('auth.forgotPassword.title')}</h1>
			<p class="body-sm text-muted-foreground">{$_('auth.forgotPassword.subtitle')}</p>
		</div>
	</div>

	{#if submitted}
		<Alert variant="success">
			<p>{$_('auth.forgotPassword.successCopy')}</p>
		</Alert>
		<p class="caption text-muted-foreground text-center">
			<a
				href={resolve('signin')}
				class="text-primary-text underline underline-offset-2 hover:no-underline"
				>{$_('auth.forgotPassword.backToSignin')}</a
			>
		</p>
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
				<Alert variant="destructive">{formError}</Alert>
			{/if}

			<Button class="w-full" type="submit" {loading} size="lg">
				{loading ? $_('common.loading') : $_('auth.forgotPassword.submit')}
			</Button>
		</form>

		<div
			class="border-border text-subtle-foreground flex flex-col items-center gap-2 border-t pt-4 sm:flex-row sm:justify-center"
		>
			<Icon icon={Lock} size="xs" />
			<span class="caption">
				{$_('auth.forgotPassword.knowIt')}

				<a
					href={resolve('signin')}
					class="text-primary-text underline underline-offset-2 hover:no-underline"
					>{$_('auth.signin.title')}</a
				>
			</span>
		</div>
	{/if}
</AuthCard>
