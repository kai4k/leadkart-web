<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Alert, AuthCard, Button } from '#lib/components/ui/index.ts';
	import { resolve } from '$app/paths';
	import { confirmEmailChange, type ConfirmEmailChangeOutcome } from '../api.ts';

	/**
	 * ConfirmEmailChangeView: the page of the link Go emails to the NEW address, in the same card as the other auth
	 * screens. Nothing is sent when the page opens: the token is single-use, so the change is confirmed by ONE CLICK
	 * of the person, never by a page load (a mail link scanner or a prefetch loads the page too and would spend it).
	 *
	 * Phases:
	 *   - 'missing'      no token in the URL
	 *   - 'ready'        waiting for the click
	 *   - 'success'      email updated
	 *   - 'invalid'      Go refused the token (expired / consumed / malformed)
	 *   - 'unreachable'  5xx / network: Go did not answer, the token is still valid, the button asks again
	 *   - 'rateLimited'  429: same, wait and ask again
	 */
	type Props = { token: string };
	let { token }: Props = $props();

	type Phase = 'missing' | 'ready' | ConfirmEmailChangeOutcome;
	// what the last click got back; null until there was one (or after the link changed)
	let outcome = $state<ConfirmEmailChangeOutcome | null>(null);
	let confirming = $state(false);
	$effect.pre(() => {
		void token;
		outcome = null;
	});
	const phase = $derived<Phase>(token === '' ? 'missing' : (outcome ?? 'ready'));

	async function confirm() {
		if (confirming) return;
		confirming = true;
		const asked = token;
		try {
			const answer = await confirmEmailChange(asked);
			if (asked === token) outcome = answer;
		} finally {
			confirming = false;
		}
	}
</script>

<AuthCard title={$_('auth.changeEmail.confirm.title')}>
	{#if phase === 'missing'}
		<Alert variant="warning">{$_('auth.changeEmail.confirm.missingToken')}</Alert>
	{:else if phase === 'success'}
		<Alert variant="success">{$_('auth.changeEmail.confirm.success')}</Alert>
		<Button class="w-full" size="lg" href={resolve('signin')}>{$_('auth.signin.title')}</Button>
	{:else if phase === 'invalid'}
		<Alert variant="destructive">{$_('auth.changeEmail.confirm.invalidToken')}</Alert>
	{:else}
		{#if phase === 'ready'}
			<p class="body-base text-foreground">{$_('auth.changeEmail.confirm.prompt')}</p>
		{:else}
			<!-- The token was not consumed, so the same click works once Go answers. -->
			<Alert variant="warning">
				{$_(
					phase === 'rateLimited'
						? 'auth.changeEmail.confirm.rateLimited'
						: 'auth.changeEmail.confirm.unreachable'
				)}
			</Alert>
		{/if}
		<Button class="w-full" size="lg" loading={confirming} disabled={confirming} onclick={confirm}>
			{$_(phase === 'ready' ? 'auth.changeEmail.confirm.submit' : 'auth.changeEmail.confirm.retry')}
		</Button>
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
