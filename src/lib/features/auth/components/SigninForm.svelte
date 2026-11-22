<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
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

	/** The seconds Go asked to wait, when it said a real number (never zero, negative or NaN). */
	const waitOf = (seconds: unknown): number =>
		typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 0;

	// A first paint (no JavaScript yet, or a native POST) already shows the server's number: seeded from the form.
	let remaining = $state(
		untrack(() => waitOf((form as { retryAfterSeconds?: unknown } | undefined)?.retryAfterSeconds))
	);
	// the countdown ran out: the lockout line gives way to "you can try again now"
	let elapsed = $state(false);
	let timer: ReturnType<typeof setInterval> | undefined;
	// The wait is a DEADLINE, not a count of ticks: a background tab throttles its timers (a tick may come minutes late),
	// so every tick and every return to the tab re-reads the clock.
	let deadline = 0;
	const stop = () => {
		clearInterval(timer);
		timer = undefined;
	};
	onDestroy(stop);

	function refresh() {
		if (deadline === 0) return;
		remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
		if (remaining === 0) {
			stop();
			deadline = 0;
			elapsed = true;
		}
	}

	/** (Re)start the countdown: one interval at a time, however many 423s arrive. */
	function begin(seconds: number) {
		stop();
		elapsed = false;
		remaining = seconds;
		deadline = seconds > 0 ? Date.now() + seconds * 1000 : 0;
		if (seconds <= 0) return;
		timer = setInterval(refresh, 1000);
	}
	onMount(() => {
		begin(remaining);
		document.addEventListener('visibilitychange', refresh);
		return () => document.removeEventListener('visibilitychange', refresh);
	});

	/** After the page applied the result: a lockout starts (or restarts) the countdown, any other result ends it. */
	function onResult(result: ActionResult) {
		// A sign-in changes the person the browser holds: the other tabs reload instead of collecting 409s.
		if (result.type === 'redirect') announceContextChange('session');
		begin(
			result.type === 'failure'
				? waitOf((result.data as { retryAfterSeconds?: unknown })?.retryAfterSeconds)
				: 0
		);
	}

	// What the lockout line says: the seconds while they count, "try again now" after, and a plain line when Go sent none.
	const shown = $derived.by(() => {
		if (!form || form.formErrorKey !== 'auth.errors.accountLocked') return form;
		if (remaining > 0) return form;
		return {
			...form,
			formErrorKey: elapsed ? 'auth.signin.canRetryNow' : 'auth.signin.lockedLater'
		};
	});
</script>

<AuthCard title={$_('auth.signin.title')} subtitle={$_('auth.signin.subtitle')}>
	<ActionForm
		id="signin-form"
		result={shown}
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
				format="email"
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
