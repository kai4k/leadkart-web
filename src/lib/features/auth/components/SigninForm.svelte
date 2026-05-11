<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Lock } from 'lucide-svelte';
	import { login } from '../api';
	import { loginRequestSchema } from '../schemas';
	import { session } from '../stores/session.svelte';
	import { isApiError } from '$api/client';
	import { Alert, AuthCard, Button, Logo } from '$lib/components/ui';
	import { TextField, PasswordField } from '$lib/components/form';

	/**
	 * SigninForm — feature-owned auth form using the cross-feature
	 * primitives + Zod-validated request body + ?next= redirect honor.
	 * Glass surface chrome lives in the AuthCard primitive (extracted
	 * once 5 auth pages wanted the same treatment — Rule of Three).
	 */

	// `?email=` prefill from an admin-initiated invite redirect.
	// Read once at mount; subsequent edits are user-driven.
	let email = $state(page.url.searchParams.get('email') ?? '');
	let password = $state('');
	let loading = $state(false);
	let formError = $state<string | null>(null);
	let fieldErrors = $state<{ email?: string; password?: string }>({});
	let errorRegion: HTMLElement | undefined = $state();

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		fieldErrors = {};

		const parsed = loginRequestSchema.safeParse({ email, password });
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			fieldErrors = {
				email: flat.email?.[0],
				password: flat.password?.[0]
			};
			return;
		}

		loading = true;
		try {
			const resp = await login(parsed.data);
			// Email captured from the form input — server doesn't echo it
			// in the LoginResponse body. UserMenu + audit-log surfaces
			// reference it.
			session.setFromLogin(resp, parsed.data.email);
			const next = page.url.searchParams.get('next');
			const target = next && next.startsWith('/') ? decodeURIComponent(next) : '/dashboard';
			await goto(target);
		} catch (err) {
			if (isApiError(err) && err.status === 401) {
				formError = $_('auth.errors.invalidCredentials');
			} else {
				formError = $_('auth.errors.unexpected');
			}
			// Move focus to the error region for screen-reader announcement.
			queueMicrotask(() => errorRegion?.focus());
		} finally {
			loading = false;
		}
	}
</script>

<AuthCard>
	<div class="flex flex-col items-center gap-6">
		<Logo size="xl" />
		<div class="stack stack-tight text-center">
			<h1 class="h1 text-[var(--color-brand-heading)]">{$_('auth.signin.title')}</h1>
			<p class="body-sm text-[var(--color-fg-muted)]">{$_('auth.signin.subtitle')}</p>
		</div>
	</div>

	<form class="stack" onsubmit={onSubmit} novalidate>
		<TextField
			label={$_('auth.signin.email')}
			type="email"
			autocomplete="email"
			required
			bind:value={email}
			error={fieldErrors.email}
		/>

		<PasswordField
			label={$_('auth.signin.password')}
			required
			bind:value={password}
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
	</form>

	<!-- Security trust badge — "256-bit SSL encrypted" microcopy with shield -->
	<div
		class="flex items-center justify-center gap-2 border-t border-[var(--color-border)] pt-4 text-[var(--color-fg-subtle)]"
	>
		<Lock size={14} aria-hidden="true" />
		<span class="caption">256-bit SSL encrypted</span>
	</div>
</AuthCard>
