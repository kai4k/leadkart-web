<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { login } from '../api';
	import { loginRequestSchema } from '../schemas';
	import { session } from '../stores/session.svelte';
	import { isApiError } from '$api/client';
	import { Alert, Button } from '$lib/components/ui';
	import { TextField, PasswordField } from '$lib/components/form';

	/**
	 * SigninForm — feature-owned auth form using the cross-feature
	 * primitives + Zod-validated request body + ?next= redirect honor.
	 *
	 * Industry canon for forms in 2026 SvelteKit:
	 *   • bind:value + onsubmit handler for the simple 2-field case
	 *   • Zod for client + server-shape parity
	 *   • aria-busy on submit, focus the error region on failure
	 *
	 * sveltekit-superforms is the heavier-weight option for complex
	 * multi-step forms; for the 2-field signin path the bind+Zod combo
	 * is leaner without losing type-safety or accessibility.
	 */

	let email = $state('');
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
			session.setFromLogin(resp);
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

<div class="stack stack-relaxed">
	<div class="stack stack-tight">
		<h1 class="h1">{$_('auth.signin.title')}</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">{$_('auth.signin.subtitle')}</p>
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

		<div class="text-center">
			<a
				href="/forgot-password"
				class="body-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
			>
				{$_('auth.signin.forgot')}
			</a>
		</div>
	</form>
</div>
