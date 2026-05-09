<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { confirmEmailChange } from '../api';
	import { isApiError } from '$api/client';
	import { Alert, AuthCard, Button } from '$ui';

	/**
	 * ConfirmEmailChangePanel — explicit-click confirmation of an email
	 * change. The user clicked the link in the new-address email and
	 * landed on /confirm-email-change?token=… ; this panel shows a
	 * "Confirm" button that triggers the API call.
	 *
	 * Why explicit-click and not auto-confirm: email clients sometimes
	 * pre-fetch links (preview pane, anti-phishing scans) which would
	 * burn the single-use token before the human even sees the page.
	 * Industry canon (Auth0, Stripe, Linear, Vercel email-confirm
	 * flows) all require an explicit user action on the confirmation
	 * page itself — the link gets the user there; the click confirms.
	 *
	 * State machine:
	 *
	 *   no token in URL          → missing-token Alert + "Start over"
	 *                              link to /settings/account/security
	 *   token present, idle      → "Confirm" button visible
	 *   token present, loading   → button shows loading state
	 *   success                  → success Alert + Sign in link
	 *   400 token_invalid        → invalid-token Alert + "Start over"
	 *   network / other          → generic Alert + retry button
	 */

	type ViewState = 'idle' | 'loading' | 'success' | 'errorInvalidToken' | 'errorGeneric';

	interface Props {
		token: string | null;
	}

	let { token }: Props = $props();

	let viewState = $state<ViewState>('idle');
	let liveRegion: HTMLElement | undefined = $state();

	// Initial transition for the missing-token case happens in $effect.pre
	// so $state's initializer doesn't capture the prop reactively (the
	// "captures only initial value" Svelte warning).
	$effect.pre(() => {
		if (!token && viewState === 'idle') viewState = 'errorInvalidToken';
	});

	async function onConfirm() {
		if (!token) {
			viewState = 'errorInvalidToken';
			return;
		}

		viewState = 'loading';
		try {
			await confirmEmailChange({ token });
			viewState = 'success';
		} catch (err) {
			if (isApiError(err) && err.status === 400) {
				viewState = 'errorInvalidToken';
			} else {
				viewState = 'errorGeneric';
			}
			queueMicrotask(() => liveRegion?.focus());
		}
	}
</script>

<AuthCard>
	<div class="stack stack-tight text-center">
		<h1 class="h1 text-[var(--color-brand-700)]">{$_('auth.confirmEmail.title')}</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">{$_('auth.confirmEmail.subtitle')}</p>
	</div>

	{#if viewState === 'idle' || viewState === 'loading'}
		<div class="stack">
			<Button onclick={onConfirm} loading={viewState === 'loading'} fullWidth size="lg">
				{viewState === 'loading'
					? $_('auth.confirmEmail.loading')
					: $_('auth.confirmEmail.confirmButton')}
			</Button>
		</div>
	{:else if viewState === 'success'}
		<div bind:this={liveRegion} tabindex="-1" class="stack">
			<Alert variant="success">{$_('auth.confirmEmail.success')}</Alert>
			<div class="text-center">
				<a
					href="/signin"
					class="body-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
				>
					{$_('auth.confirmEmail.signin')}
				</a>
			</div>
		</div>
	{:else if viewState === 'errorInvalidToken'}
		<div bind:this={liveRegion} tabindex="-1" class="stack">
			<Alert variant="danger">
				{token ? $_('auth.confirmEmail.invalidToken') : $_('auth.confirmEmail.missingToken')}
			</Alert>
			<div class="text-center">
				<a
					href="/settings/account/security"
					class="body-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
				>
					{$_('auth.confirmEmail.requestNew')}
				</a>
			</div>
		</div>
	{:else}
		<div bind:this={liveRegion} tabindex="-1" class="stack">
			<Alert variant="danger">{$_('auth.confirmEmail.genericError')}</Alert>
			<Button onclick={onConfirm} variant="secondary" fullWidth>
				{$_('auth.confirmEmail.confirmButton')}
			</Button>
		</div>
	{/if}
</AuthCard>
