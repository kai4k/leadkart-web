<script lang="ts">
	import { onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { ActionResult } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { announceContextChange } from '#lib/api/operator-scope.ts';
	import { AuthCard } from '#lib/components/ui/index.ts';
	import { ActionForm, PasswordField, TextField } from '#lib/components/form/index.ts';
	import type { ActionData } from '../../../../routes/(auth)/signin/$types';

	/**
	 * SigninForm: the sign-in card. The action lives at (auth)/signin/+page.server.ts; the `form` prop is its last
	 * result (validation errors, a refused login, the lockout). Three outcomes (ADR 0053): a redirect to
	 * /must-change-password, a redirect to /dashboard (or `?next=`), or a 423 with `retryAfterSeconds`, which this
	 * card counts down: the button stays off until the wait is over, and the banner shows the seconds left.
	 * `?email=` prefills the field (an admin-initiated invite).
	 */
	type Props = { form?: ActionData };
	let { form }: Props = $props();

	let remaining = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;
	const stop = () => {
		clearInterval(timer);
		timer = undefined;
	};
	onDestroy(stop);

	/** After the page applied the result: a lockout starts (or restarts) the countdown, any other result ends it. */
	function onResult(result: ActionResult) {
		// A sign-in changes the person the browser holds: the other tabs reload instead of collecting 409s.
		if (result.type === 'redirect') announceContextChange('session');
		stop();
		const seconds =
			result.type === 'failure'
				? (result.data as { retryAfterSeconds?: unknown })?.retryAfterSeconds
				: 0;
		remaining = typeof seconds === 'number' && seconds > 0 ? Math.ceil(seconds) : 0;
		if (remaining > 0) {
			timer = setInterval(() => {
				remaining = Math.max(0, remaining - 1);
				if (remaining === 0) stop();
			}, 1000);
		}
	}
</script>

<AuthCard title={$_('auth.signin.title')} subtitle={$_('auth.signin.subtitle')}>
	<ActionForm
		id="signin-form"
		result={form}
		scoped={false}
		wide
		submitLabel={$_('auth.signin.submit')}
		submitDisabled={remaining > 0}
		bannerValues={{ seconds: remaining }}
		{onResult}
	>
		{#snippet children({ fieldError, value })}
			<TextField
				label={$_('auth.signin.email')}
				name="email"
				type="email"
				autocomplete="username"
				required
				value={String(value('email') ?? page.url.searchParams.get('email') ?? '')}
				error={fieldError('email')}
			/>
			<PasswordField
				label={$_('auth.signin.password')}
				name="password"
				autocomplete="current-password"
				required
				error={fieldError('password')}
			/>
		{/snippet}
	</ActionForm>
	{#snippet footer()}
		<a
			href={resolve('forgot-password')}
			class="text-primary-text underline underline-offset-2 hover:no-underline"
			>{$_('auth.signin.forgotPassword')}</a
		>
	{/snippet}
</AuthCard>
