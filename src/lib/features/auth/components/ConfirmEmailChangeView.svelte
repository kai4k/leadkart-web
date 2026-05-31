<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Alert, AuthCard, Logo } from '$ui';
	import { resolve } from '$app/paths';
	import type { ConfirmPhase } from '../../../../routes/(auth)/confirm-email-change/+page';

	/**
	 * ConfirmEmailChangeView — Svelte canon load-shaped route.
	 * The POST happens in (auth)/confirm-email-change/+page.ts; this
	 * component is a pure renderer over the `phase` returned by load.
	 */
	type Props = { phase: ConfirmPhase };
	let { phase }: Props = $props();
</script>

<AuthCard>
	<div class="flex flex-col items-center gap-6">
		<Logo size="2xl" />
		<div class="stack stack-tight text-center">
			<h1 class="h1 text-brand-heading">{$_('auth.changeEmail.confirm.title')}</h1>
			<p class="body-sm text-fg-muted">{$_('auth.changeEmail.confirm.subtitle')}</p>
		</div>
	</div>

	{#if phase === 'missing'}
		<Alert variant="warning">{$_('auth.changeEmail.confirm.missingToken')}</Alert>
	{:else if phase === 'success'}
		<Alert variant="success">{$_('auth.changeEmail.confirm.success')}</Alert>
		<a
			href={resolve('/signin')}
			class="bg-primary hover:bg-primary-hover focus-visible:ring-focus-ring inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
		>
			{$_('auth.signin.title')}
		</a>
	{:else}
		<Alert variant="danger">{$_('auth.changeEmail.confirm.invalidToken')}</Alert>
		<a
			href={resolve('/settings/account/security')}
			class="text-fg-muted hover:bg-bg-muted focus-visible:ring-focus-ring inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
		>
			{$_('common.cancel')}
		</a>
	{/if}
</AuthCard>
