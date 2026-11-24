<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Card } from '#lib/components/ui/index.ts';
	import { ChangePasswordForm, ChangeEmailForm } from '#lib/features/auth/index.ts';
	import type { ActionData } from './$types';

	/**
	 * /settings/account/security — two form actions (changePassword,
	 * changeEmail). Each form filters by `form.which` so it only renders
	 * the result for its own action.
	 */
	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>{$_('account.security.title')} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<header class="stack stack-tight">
		<h2 class="h4">{$_('account.security.title')}</h2>
		<p class="body-sm text-muted-foreground">{$_('account.security.subtitle')}</p>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>{$_('account.security.changePassword.title')}</Card.Title>
			<Card.Description>{$_('account.security.changePassword.description')}</Card.Description>
		</Card.Header>
		<Card.Content>
			<ChangePasswordForm form={form ?? undefined} />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{$_('auth.changeEmail.title')}</Card.Title>
			<Card.Description>{$_('auth.changeEmail.subtitle')}</Card.Description>
		</Card.Header>
		<Card.Content>
			<ChangeEmailForm form={form ?? undefined} />
		</Card.Content>
	</Card.Root>
</div>
