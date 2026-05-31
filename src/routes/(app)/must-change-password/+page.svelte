<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { enhance } from '$app/forms';
	import { Alert, Button, Card } from '$ui';
	import { PasswordField } from '$lib/components/form';
	import type { ActionData } from './$types';

	/**
	 * /must-change-password — forced password rotation per ADR 0053.
	 *
	 * Reached when login returned `must_change_password=true`. The action
	 * at +page.server.ts handles the rotation server-side; this component
	 * is a pure renderer over the `form` prop.
	 */
	let { form }: { form: ActionData } = $props();
	let loading = $state(false);

	const formErrorKey = $derived(
		form && 'formErrorKey' in form && form.formErrorKey ? form.formErrorKey : null
	);
	const formError = $derived(formErrorKey ? $_(formErrorKey) : null);

	const fieldKeys = $derived<{ current?: string; new?: string; confirm?: string }>(
		form && 'fieldKeys' in form && form.fieldKeys ? form.fieldKeys : {}
	);
	const fieldErrors = $derived({
		current: fieldKeys.current ? $_(fieldKeys.current) : undefined,
		new: fieldKeys.new ? $_(fieldKeys.new) : undefined,
		confirm: fieldKeys.confirm ? $_(fieldKeys.confirm) : undefined
	});
</script>

<svelte:head>
	<title>{$_('auth.mustChange.title')} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed mx-auto max-w-lg">
	<header class="stack stack-tight">
		<h1 class="h1">{$_('auth.mustChange.title')}</h1>
		<p class="body-base text-fg-muted">{$_('auth.mustChange.subtitle')}</p>
	</header>

	<Card.Root>
		<Card.Content>
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
					label={$_('account.security.changePassword.currentPassword')}
					name="current_password"
					autocomplete="current-password"
					required
					error={fieldErrors.current}
				/>
				<PasswordField
					label={$_('account.security.changePassword.newPassword')}
					name="new_password"
					hint={$_('account.security.changePassword.newPasswordHint')}
					autocomplete="new-password"
					required
					error={fieldErrors.new}
				/>
				<PasswordField
					label={$_('account.security.changePassword.confirmPassword')}
					name="confirm"
					autocomplete="new-password"
					required
					error={fieldErrors.confirm}
				/>
				{#if formError}
					<Alert variant="danger">{formError}</Alert>
				{/if}
				<Button type="submit" {loading} fullWidth size="lg">
					{loading ? $_('common.loading') : $_('auth.mustChange.submit')}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
