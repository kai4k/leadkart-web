<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Lock } from 'lucide-svelte';
	import { login, LoginError } from '../api';
	import { loginRequestSchema } from '../schemas';
	import { Alert, AuthCard, Button, Logo } from '$lib/components/ui';
	import { TextField, PasswordField } from '$lib/components/form';

	/**
	 * SigninForm — feature-owned auth form using the cross-feature
	 * primitives + Zod-validated request body + ?next= redirect honor.
	 *
	 * Three post-submit branches per ADR 0053:
	 *   1. 200 with must_change_password=true → /must-change-password
	 *      (mandatory rotation before any other action).
	 *   2. 200 with must_change_password=false → /dashboard (or ?next=).
	 *   3. 423 locked → render countdown using Retry-After delta-seconds.
	 *
	 * `?email=` prefill from an admin-initiated invite redirect. Read once
	 * at mount; subsequent edits are user-driven.
	 */

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
			const result = await login(parsed.data);
			if (result.must_change_password) {
				const nextParam = page.url.searchParams.get('next');
				const suffix = nextParam ? `?next=${encodeURIComponent(nextParam)}` : '';
				await goto(`/must-change-password${suffix}`);
				return;
			}
			const next = page.url.searchParams.get('next');
			const target = next && next.startsWith('/') ? decodeURIComponent(next) : '/dashboard';
			await goto(target);
		} catch (err) {
			if (err instanceof LoginError) {
				if (err.status === 423 && err.retryAfterSeconds !== undefined) {
					formError = $_('auth.errors.accountLocked', {
						values: { seconds: err.retryAfterSeconds }
					});
				} else if (err.status === 401) {
					formError = $_('auth.errors.invalidCredentials');
				} else {
					formError = $_('auth.errors.unexpected');
				}
			} else {
				formError = $_('auth.errors.unexpected');
			}
			queueMicrotask(() => errorRegion?.focus());
		} finally {
			loading = false;
		}
	}
</script>

<AuthCard>
	<div class="flex flex-col items-center gap-6">
		<Logo size="2xl" />
		<div class="stack stack-tight text-center">
			<h1 class="h1 text-brand-heading">{$_('auth.signin.title')}</h1>
			<p class="body-sm text-fg-muted">{$_('auth.signin.subtitle')}</p>
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

		<p class="caption text-fg-muted text-center">
			<a href="/forgot-password" class="text-primary hover:underline"
				>{$_('auth.signin.forgotPassword')}</a
			>
		</p>
	</form>

	<div
		class="border-border text-fg-subtle flex flex-col items-center gap-2 border-t pt-4 sm:flex-row sm:justify-center"
	>
		<Lock size={14} aria-hidden="true" />
		<span class="caption">256-bit SSL encrypted</span>
	</div>
</AuthCard>
