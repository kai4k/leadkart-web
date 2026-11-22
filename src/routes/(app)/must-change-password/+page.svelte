<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { AuthCard } from '$ui';
	import { ActionForm, PasswordField } from '#lib/components/form/index.ts';
	import { session } from '$features/auth';
	import { passwordPolicyHint } from '#lib/features/auth/password-policy.ts';
	import type { ActionData } from './$types';

	/**
	 * /must-change-password: forced password rotation per ADR 0053. Reached when login returned
	 * `must_change_password=true`. The action at +page.server.ts rotates the password server-side; this page is a
	 * renderer over the `form` prop, in the same card as the sign-in screens. A change of password ends in a
	 * redirect, so nothing typed stays on screen.
	 */
	let { form }: { form: ActionData } = $props();
	const hint = $derived(passwordPolicyHint(session.capabilities?.password_policy, $_));
</script>

<svelte:head>
	<title>{$_('auth.mustChange.title')} · LeadKart</title>
</svelte:head>

<div class="mx-auto w-full max-w-[min(28rem,100%)]">
	<AuthCard title={$_('auth.mustChange.title')} subtitle={$_('auth.mustChange.subtitle')}>
		<ActionForm
			id="must-change-password-form"
			result={form}
			wide
			resetOnSuccess
			submitLabel={$_('auth.mustChange.submit')}
		>
			{#snippet children({ fieldError })}
				<PasswordField
					label={$_('account.security.changePassword.currentPassword')}
					name="current_password"
					autocomplete="current-password"
					required
					error={fieldError('current')}
				/>
				<PasswordField
					label={$_('account.security.changePassword.newPassword')}
					name="new_password"
					{hint}
					autocomplete="new-password"
					required
					error={fieldError('new')}
				/>
				<PasswordField
					label={$_('account.security.changePassword.confirmPassword')}
					name="confirm"
					autocomplete="new-password"
					required
					error={fieldError('confirm')}
				/>
			{/snippet}
		</ActionForm>
	</AuthCard>
</div>
