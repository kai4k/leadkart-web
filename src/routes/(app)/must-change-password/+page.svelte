<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { enhance } from '$app/forms';
	import { Alert, Button, Card } from '$ui';
	import { PasswordField, ScopeContextField } from '#lib/components/form/index.ts';
	import { bannerText, fieldText, readFailure } from '#lib/utils/form-failure.ts';
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

	const failure = $derived(readFailure(form));
	const formError = $derived(bannerText(failure, $_));
	const fieldErrors = $derived({
		current: fieldText(failure, 'current', $_),
		new: fieldText(failure, 'new', $_),
		confirm: fieldText(failure, 'confirm', $_)
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
				<ScopeContextField />
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
