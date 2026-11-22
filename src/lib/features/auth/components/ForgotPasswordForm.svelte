<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { resolve } from '$app/paths';
	import { Alert, AuthCard } from '#lib/components/ui/index.ts';
	import { ActionForm, TextField } from '#lib/components/form/index.ts';
	import type { ActionData } from '../../../../routes/(auth)/forgot-password/$types';

	/**
	 * ForgotPasswordForm: the action lives at (auth)/forgot-password/+page.server.ts. The success copy is identical
	 * for "email exists" and "email doesn't" (Auth0 / Okta canon: no account enumeration).
	 */
	type Props = { form?: ActionData };
	let { form }: Props = $props();

	const submitted = $derived(Boolean(form && 'submitted' in form && form.submitted));
</script>

<AuthCard title={$_('auth.forgotPassword.title')} subtitle={$_('auth.forgotPassword.subtitle')}>
	{#if submitted}
		<Alert variant="success">
			<p>{$_('auth.forgotPassword.successCopy')}</p>
		</Alert>
	{:else}
		<ActionForm
			id="forgot-password-form"
			result={form}
			scoped={false}
			wide
			submitLabel={$_('auth.forgotPassword.submit')}
		>
			{#snippet children({ fieldError, value })}
				<TextField
					label={$_('auth.forgotPassword.email')}
					name="email"
					type="email"
					autocomplete="username"
					required
					value={String(value('email') ?? '')}
					error={fieldError('email')}
				/>
			{/snippet}
		</ActionForm>
	{/if}
	{#snippet footer()}
		{#if !submitted}{$_('auth.forgotPassword.knowIt')}{/if}
		<a
			href={resolve('signin')}
			class="text-primary-text underline underline-offset-2 hover:no-underline"
			>{submitted ? $_('auth.forgotPassword.backToSignin') : $_('auth.signin.title')}</a
		>
	{/snippet}
</AuthCard>
