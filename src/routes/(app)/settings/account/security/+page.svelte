<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Card } from '$ui';
	import ChangePasswordForm from '$features/auth/components/ChangePasswordForm.svelte';
	import ChangeEmailForm from '$features/auth/components/ChangeEmailForm.svelte';

	/**
	 * /settings/account/security — Account & Security page.
	 *
	 * Surfaces:
	 *   - Change password  (authenticated, requires current password)
	 *   - Change email     (authenticated; sends confirmation link to the
	 *                       NEW address — change doesn't apply until the
	 *                       link is clicked)
	 */
</script>

<svelte:head>
	<title>{$_('account.security.title')} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h1 class="h1">{$_('account.security.title')}</h1>
		<p class="body-sm text-fg-muted">{$_('account.security.subtitle')}</p>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>{$_('account.security.changePassword.title')}</Card.Title>
			<Card.Description>{$_('account.security.changePassword.description')}</Card.Description>
		</Card.Header>
		<Card.Content>
			<ChangePasswordForm />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{$_('auth.changeEmail.title')}</Card.Title>
			<Card.Description>{$_('auth.changeEmail.subtitle')}</Card.Description>
		</Card.Header>
		<Card.Content>
			<ChangeEmailForm />
		</Card.Content>
	</Card.Root>
</div>
