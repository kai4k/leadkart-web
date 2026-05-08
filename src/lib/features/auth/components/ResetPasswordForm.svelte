<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { confirmPasswordReset } from '../api';
	import { resetPasswordSchema } from '../schemas';
	import { isApiError } from '$api/client';
	import { Alert, Button } from '$ui';
	import { PasswordField } from '$form';

	/**
	 * ResetPasswordForm — completes the recovery flow with the token
	 * the user clicked from their email. Surfaces three distinct error
	 * shapes:
	 *
	 *   400 reset_token_invalid          → top banner + "Request new"
	 *                                       link to /forgot-password.
	 *                                       The form is unrecoverable
	 *                                       in this state — token is
	 *                                       single-use + time-bounded.
	 *
	 *   422 password_breached  /         → field-level error on the
	 *   422 password_same_as_current        new-password input. Server
	 *                                       message text is human-
	 *                                       readable; surface verbatim.
	 *
	 *   missing token in URL             → same banner as 400 (token
	 *                                       absent + token invalid are
	 *                                       indistinguishable to the
	 *                                       user — neither path is
	 *                                       fixable from this screen).
	 *
	 * Confirm-new-password is enforced client-side only — the server
	 * doesn't know about it. Mismatch surfaces as a field error on the
	 * confirm input.
	 */

	interface Props {
		token: string | null;
	}

	let { token }: Props = $props();

	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let bannerError = $state<string | null>(null);
	let fieldErrors = $state<{ new_password?: string; confirm_password?: string }>({});
	let bannerRegion: HTMLElement | undefined = $state();

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		bannerError = null;
		fieldErrors = {};

		if (!token) {
			bannerError = $_('auth.reset.missingToken');
			queueMicrotask(() => bannerRegion?.focus());
			return;
		}

		if (newPassword !== confirmPassword) {
			fieldErrors = { confirm_password: $_('auth.reset.mismatch') };
			return;
		}

		const parsed = resetPasswordSchema.safeParse({ token, new_password: newPassword });
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			fieldErrors = { new_password: flat.new_password?.[0] };
			return;
		}

		loading = true;
		try {
			await confirmPasswordReset(parsed.data);
			await goto('/signin');
		} catch (err) {
			if (isApiError(err)) {
				if (err.status === 400) {
					bannerError = $_('auth.reset.invalidToken');
				} else if (err.status === 422) {
					// 422 covers password_breached + password_same_as_current.
					// Server message text differentiates both with human-readable
					// copy ("present in known breach databases", "must differ
					// from current"); surface as a field-level error.
					fieldErrors = {
						new_password: err.message || $_('auth.reset.genericError')
					};
				} else {
					bannerError = $_('auth.reset.genericError');
				}
			} else {
				bannerError = $_('auth.reset.genericError');
			}
			queueMicrotask(() => bannerRegion?.focus());
		} finally {
			loading = false;
		}
	}
</script>

<div class="stack stack-relaxed">
	<div class="stack stack-tight">
		<h1 class="h1">{$_('auth.reset.title')}</h1>
		<p class="body-sm text-[var(--color-fg-muted)]">{$_('auth.reset.subtitle')}</p>
	</div>

	{#if !token}
		<div bind:this={bannerRegion} tabindex="-1" class="stack">
			<Alert variant="danger">{$_('auth.reset.missingToken')}</Alert>
			<a
				href="/forgot-password"
				class="body-sm text-center text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
			>
				{$_('auth.reset.requestNew')}
			</a>
		</div>
	{:else}
		<form class="stack" onsubmit={onSubmit} novalidate>
			<PasswordField
				label={$_('auth.reset.newPassword')}
				hint={$_('auth.reset.newPasswordHint')}
				autocomplete="new-password"
				required
				bind:value={newPassword}
				error={fieldErrors.new_password}
			/>

			<PasswordField
				label={$_('auth.reset.confirmPassword')}
				autocomplete="new-password"
				required
				bind:value={confirmPassword}
				error={fieldErrors.confirm_password}
			/>

			{#if bannerError}
				<div bind:this={bannerRegion} tabindex="-1" class="stack">
					<Alert variant="danger">{bannerError}</Alert>
					<a
						href="/forgot-password"
						class="body-sm text-center text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
					>
						{$_('auth.reset.requestNew')}
					</a>
				</div>
			{/if}

			<Button type="submit" {loading} fullWidth size="lg">
				{loading ? $_('common.loading') : $_('auth.reset.submit')}
			</Button>

			<div class="text-center">
				<a
					href="/signin"
					class="body-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
				>
					{$_('auth.forgot.backToSignin')}
				</a>
			</div>
		</form>
	{/if}
</div>
