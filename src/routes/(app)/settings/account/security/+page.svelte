<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Card } from '$ui';
	import ChangePasswordForm from '$features/auth/components/ChangePasswordForm.svelte';
	import RequestEmailChangeForm from '$features/auth/components/RequestEmailChangeForm.svelte';

	/**
	 * /settings/account/security — Account & Security page. Two Cards:
	 * Change password + Change email. The change-email flow completes
	 * via the anonymous /confirm-email-change?token=… route.
	 */
</script>

<svelte:head>
	<title>{$_('account.security.title')} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h1 class="h1">{$_('account.security.title')}</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">{$_('account.security.subtitle')}</p>
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
			<Card.Title>{$_('account.security.changeEmail.title')}</Card.Title>
			<Card.Description>{$_('account.security.changeEmail.description')}</Card.Description>
		</Card.Header>
		<Card.Content>
			<RequestEmailChangeForm />
		</Card.Content>
	</Card.Root>
</div>
