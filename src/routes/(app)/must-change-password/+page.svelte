<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { z } from 'zod';
	import { changePassword } from '$features/auth/api';
	import { Alert, Button, Card } from '$ui';
	import { PasswordField } from '$lib/components/form';
	import { AuthError, ValidationError, NetworkError } from '$api/errors';

	/**
	 * /must-change-password — forced password rotation per ADR 0053.
	 *
	 * Reached when the BFF login response carries `must_change_password=true`
	 * (admin-invite passwords, expired credentials, force-rotate). The
	 * dashboard sidebar isn't useful here — the user can't act on anything
	 * else until they rotate. We surface only the form; the layout's
	 * AppShell shows the standard chrome but the page itself is bounded.
	 *
	 * Flow:
	 *   current + new + confirm → POST /v1/auth/change-password (authenticated;
	 *   the access cookie from sign-in is in flight) → 204 → goto ?next=
	 *   or /dashboard.
	 */

	const schema = z.object({
		current_password: z.string().min(1, $_('account.security.changePassword.currentPassword')),
		new_password: z.string().min(12, $_('account.security.changePassword.newPasswordHint'))
	});

	let current = $state('');
	let next = $state('');
	let confirm = $state('');
	let fieldErrors = $state<{ current?: string; new?: string; confirm?: string }>({});
	let formError = $state<string | null>(null);
	let loading = $state(false);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		fieldErrors = {};

		if (next !== confirm) {
			fieldErrors = { confirm: $_('account.security.changePassword.errors.mismatch') };
			return;
		}
		const parsed = schema.safeParse({ current_password: current, new_password: next });
		if (!parsed.success) {
			const flat = parsed.error.flatten().fieldErrors;
			fieldErrors = {
				current: flat.current_password?.[0],
				new: flat.new_password?.[0]
			};
			return;
		}

		loading = true;
		try {
			await changePassword(parsed.data);
			const nextParam = page.url.searchParams.get('next');
			const target = nextParam && nextParam.startsWith('/') ? nextParam : '/dashboard';
			await goto(target);
		} catch (err) {
			if (err instanceof AuthError && err.status === 401) {
				fieldErrors = { current: $_('account.security.changePassword.errors.incorrectCurrent') };
			} else if (err instanceof ValidationError) {
				if (err.code === 'password_breached') {
					fieldErrors = { new: $_('auth.resetPassword.errors.breached') };
				} else if (err.code === 'password_same') {
					fieldErrors = { new: $_('auth.resetPassword.errors.same') };
				} else {
					fieldErrors = { new: $_('auth.resetPassword.errors.weak') };
				}
			} else if (err instanceof NetworkError) {
				formError = 'Check your network connection and try again.';
			} else {
				formError = $_('auth.errors.unexpected');
			}
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{$_('auth.mustChange.title')} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed mx-auto max-w-lg">
	<header class="stack stack-tight">
		<h1 class="h1">{$_('auth.mustChange.title')}</h1>
		<p class="body-base text-fg-muted">{$_('auth.mustChange.subtitle')}</p>
	</header>

	<Card.Root>
		<Card.Content>
			<form class="stack" onsubmit={onSubmit} novalidate>
				<PasswordField
					label={$_('account.security.changePassword.currentPassword')}
					autocomplete="current-password"
					required
					bind:value={current}
					error={fieldErrors.current}
				/>
				<PasswordField
					label={$_('account.security.changePassword.newPassword')}
					hint={$_('account.security.changePassword.newPasswordHint')}
					autocomplete="new-password"
					required
					bind:value={next}
					error={fieldErrors.new}
				/>
				<PasswordField
					label={$_('account.security.changePassword.confirmPassword')}
					autocomplete="new-password"
					required
					bind:value={confirm}
					error={fieldErrors.confirm}
				/>
				{#if formError}
					<Alert variant="danger">{formError}</Alert>
				{/if}
				<Button type="submit" {loading} fullWidth size="lg">
					{loading ? $_('common.loading') : $_('auth.mustChange.submit')}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
