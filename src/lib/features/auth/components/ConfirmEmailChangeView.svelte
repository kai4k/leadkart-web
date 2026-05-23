<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { Alert, AuthCard, Logo, Spinner } from '$ui';
	import { confirmEmailChange } from '../api';

	/**
	 * ConfirmEmailChangeView — public confirmation step.
	 *
	 * Reads the token from ?token= and POSTs it on mount. Four phases:
	 *   - 'missing' → no token in URL
	 *   - 'pending' → in-flight
	 *   - 'success' → email updated
	 *   - 'invalid' → token expired/consumed/malformed
	 */

	const token = $derived(page.url.searchParams.get('token') ?? '');

	let phase: 'pending' | 'success' | 'invalid' | 'missing' = $state('pending');
	let errorMessage: string | null = $state(null);

	$effect(() => {
		if (!token) {
			phase = 'missing';
			return;
		}
		confirmEmailChange({ token })
			.then(() => {
				phase = 'success';
			})
			.catch((err) => {
				phase = 'invalid';
				errorMessage = (err as Error).message;
			});
	});
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
	{:else if phase === 'pending'}
		<div class="flex justify-center py-8">
			<Spinner size={28} />
		</div>
	{:else if phase === 'success'}
		<Alert variant="success">{$_('auth.changeEmail.confirm.success')}</Alert>
		<a
			href="/signin"
			class="bg-primary hover:bg-primary-hover focus-visible:ring-focus-ring inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
			>{$_('auth.signin.title')}</a
		>
	{:else}
		<Alert variant="danger">
			{errorMessage ?? $_('auth.changeEmail.confirm.invalidToken')}
		</Alert>
		<a
			href="/settings/account/security"
			class="text-fg-muted hover:bg-bg-muted focus-visible:ring-focus-ring inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
			>{$_('common.cancel')}</a
		>
	{/if}
</AuthCard>
