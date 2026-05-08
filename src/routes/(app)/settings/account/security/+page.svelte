<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Card } from '$ui';
	import ChangePasswordForm from '$features/auth/components/ChangePasswordForm.svelte';

	/**
	 * /settings/account/security — Account & Security page. The
	 * ChangeEmailForm Card lands in commit A7 alongside the
	 * /confirm-email-change route.
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
</div>
