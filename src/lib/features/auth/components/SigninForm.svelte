<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Icon, Lock } from '$lib/icons';
	import { Alert, AuthCard, Button, Logo } from '$lib/components/ui';
	import { TextField, PasswordField } from '$lib/components/form';
	import { resolve } from '$app/paths';
	import type { ActionData } from '../../../../routes/(auth)/signin/$types';

	/**
	 * SigninForm — Svelte canon for form-shaped routes per the
	 * "per-route shape" principle: forms use SvelteKit form actions +
	 * use:enhance for progressive enhancement, lists use TanStack.
	 *
	 * The action lives at (auth)/signin/+page.server.ts. The `form` prop
	 * exposes the action's last result (validation errors, login error,
	 * lockout countdown). use:enhance keeps the submit on-page when JS
	 * is available and degrades to a full POST + 303 redirect without it.
	 *
	 * Three post-submit branches per ADR 0053:
	 *   1. 200 with must_change_password=true → /must-change-password
	 *   2. 200 with must_change_password=false → /dashboard (or ?next=)
	 *   3. 423 locked → renders countdown using returned retryAfterSeconds
	 *
	 * `?email=` prefill from an admin-initiated invite redirect.
	 */

	type Props = { form?: ActionData };
	let { form }: Props = $props();

	let loading = $state(false);
	let errorRegion: HTMLElement | undefined = $state();

	// Repopulate email after a failed submit (server returned `email`).
	// Falls back to ?email= prefill on first render.
	const initialEmail = $derived(form?.email ?? page.url.searchParams.get('email') ?? '');

	const formError = $derived.by(() => {
		if (!form || !('formError' in form) || !form.formError) return null;
		const key = form.formError;
		const rawSeconds =
			'retryAfterSeconds' in form ? (form.retryAfterSeconds as unknown) : undefined;
		const seconds = typeof rawSeconds === 'number' ? rawSeconds : undefined;
		if (key === 'auth.errors.accountLocked' && seconds !== undefined) {
			return $_(key, { values: { seconds } });
		}
		return $_(key);
	});

	const fieldErrors = $derived(
		form && 'errors' in form && form.errors
			? form.errors
			: ({} as { email?: string; password?: string })
	);

	$effect(() => {
		if (formError) queueMicrotask(() => errorRegion?.focus());
	});
</script>

<AuthCard>
	<div class="flex flex-col items-center gap-6">
		<Logo size="2xl" />
		<div class="stack stack-tight text-center">
			<h1 class="h1 text-brand-heading">{$_('auth.signin.title')}</h1>
			<p class="body-sm text-fg-muted">{$_('auth.signin.subtitle')}</p>
		</div>
	</div>

	<form
		class="stack"
		method="POST"
		novalidate
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<TextField
			label={$_('auth.signin.email')}
			name="email"
			type="email"
			autocomplete="email"
			required
			value={initialEmail}
			error={fieldErrors.email}
		/>

		<PasswordField
			label={$_('auth.signin.password')}
			name="password"
			required
			error={fieldErrors.password}
		/>

		{#if formError}
			<div bind:this={errorRegion} tabindex="-1">
				<Alert variant="danger">{formError}</Alert>
			</div>
		{/if}

		<Button type="submit" {loading} fullWidth size="lg">
			{loading ? $_('common.loading') : $_('auth.signin.submit')}
		</Button>

		<p class="caption text-fg-muted text-center">
			<a href={resolve('/forgot-password')} class="text-primary hover:underline">
				{$_('auth.signin.forgotPassword')}
			</a>
		</p>
	</form>

	<div
		class="border-border text-fg-subtle flex flex-col items-center gap-2 border-t pt-4 sm:flex-row sm:justify-center"
	>
		<Icon icon={Lock} size="xs" />
		<span class="caption">256-bit SSL encrypted</span>
	</div>
</AuthCard>
