<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Alert, AuthCard, Button } from '$ui';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { ConfirmPhase } from '../../../../routes/(auth)/confirm-email-change/+page';

	/**
	 * ConfirmEmailChangeView: the POST happens in (auth)/confirm-email-change/+page.ts; this component is a pure
	 * renderer over the `phase` the load returned, in the same card as the other auth screens.
	 */
	type Props = { phase: ConfirmPhase };
	let { phase }: Props = $props();
</script>

<AuthCard title={$_('auth.changeEmail.confirm.title')}>
	{#if phase === 'missing'}
		<Alert variant="warning">{$_('auth.changeEmail.confirm.missingToken')}</Alert>
	{:else if phase === 'success'}
		<Alert variant="success">{$_('auth.changeEmail.confirm.success')}</Alert>
		<Button class="w-full" size="lg" href={resolve('signin')}>{$_('auth.signin.title')}</Button>
	{:else if phase === 'unreachable' || phase === 'rateLimited'}
		<!-- The token was never consumed, so the same link works once Go answers: re-run the load. -->
		<Alert variant="warning">
			{$_(
				phase === 'rateLimited'
					? 'auth.changeEmail.confirm.rateLimited'
					: 'auth.changeEmail.confirm.unreachable'
			)}
		</Alert>
		<Button class="w-full" size="lg" onclick={() => invalidateAll()}>
			{$_('auth.changeEmail.confirm.retry')}
		</Button>
	{:else}
		<Alert variant="destructive">{$_('auth.changeEmail.confirm.invalidToken')}</Alert>
	{/if}
	{#snippet footer()}
		{#if phase === 'invalid'}
			<a
				href={resolve('settings/account/security')}
				class="text-primary-text underline underline-offset-2 hover:no-underline"
				>{$_('common.cancel')}</a
			>
		{/if}
	{/snippet}
</AuthCard>
