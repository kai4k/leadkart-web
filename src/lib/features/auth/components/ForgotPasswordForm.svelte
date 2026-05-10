<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { requestPasswordReset } from '../api';
	import { requestPasswordResetSchema } from '../schemas';
	import { Alert, AuthCard, Button } from '$ui';
	import { TextField } from '$form';

	/**
	 * ForgotPasswordForm â€” emails a reset link via the leadkart-go
	 * anonymous endpoint. The server ALWAYS returns 204 regardless of
	 * whether the email is registered (Auth0 / Okta enumeration-safety
	 * canon); the UI mirrors that property by showing the same neutral
	 * success copy on every successful submit.
	 *
	 * Network / non-2xx failures DO surface (so users on bad WiFi know
	 * the request didn't reach the server), but the success copy
	 * itself never reveals whether the email exists.
	 */

	let email = $state('');
	let loading = $state(false);
	let success = $state(false);
	let formError = $state<string | null>(null);
	let fieldErrors = $state<{ email?: string }>({});
	let errorRegion: HTMLElement | undefined = $state();

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		fieldErrors = {};

		const parsed = requestPasswordResetSchema.safeParse({ email });
		if (!parsed.success) {
			fieldErrors = { email: parsed.error.flatten().fieldErrors.email?.[0] };
			return;
		}

		loading = true;
		try {
			await requestPasswordReset(parsed.data);
			success = true;
		} catch {
			formError = $_('auth.forgot.error');
			queueMicrotask(() => errorRegion?.focus());
		} finally {
			loading = false;
		}
	}
</script>

<AuthCard>
	<div class="stack stack-tight text-center">
		<h1 class="h1 text-[var(--color-brand-heading)]">{$_('auth.forgot.title')}</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">{$_('auth.forgot.subtitle')}</p>
	</div>

	{#if success}
		<Alert variant="success">{$_('auth.forgot.success')}</Alert>
		<div class="text-center">
			<a
				href="/signin"
				class="body-sm text-[var(--color-brand-link)] hover:text-[var(--color-brand-link-hover)]"
			>
				{$_('auth.forgot.backToSignin')}
			</a>
		</div>
	{:else}
		<form class="stack" onsubmit={onSubmit} novalidate>
			<TextField
				label={$_('auth.forgot.email')}
				type="email"
				autocomplete="email"
				required
				bind:value={email}
				error={fieldErrors.email}
			/>

			{#if formError}
				<div bind:this={errorRegion} tabindex="-1">
					<Alert variant="danger">{formError}</Alert>
				</div>
			{/if}

			<Button type="submit" {loading} fullWidth size="lg">
				{loading ? $_('common.loading') : $_('auth.forgot.submit')}
			</Button>

			<div class="text-center">
				<a
					href="/signin"
					class="body-sm text-[var(--color-brand-link)] hover:text-[var(--color-brand-link-hover)]"
				>
					{$_('auth.forgot.backToSignin')}
				</a>
			</div>
		</form>
	{/if}
</AuthCard>
